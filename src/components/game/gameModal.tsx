"use client";

import { BeatmapData, parseOsz } from "@/lib/beatmapParser";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useBeatmapSetCacheContext } from "../providers/beatmapSetCacheProvider";
import { useGameContext } from "../providers/gameOverlayProvider";
import { useSettingsContext } from "../providers/settingsProvider";
import { useToast } from "../ui/use-toast";
import GameScreens from "./gameScreens";

const GameModal = () => {
  const { data } = useGameContext();
  const [beatmapData, setBeatmapData] = useState<BeatmapData | null>(null);
  const [key, setKey] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(
    "Downloading Beatmap...",
  );
  const { settings } = useSettingsContext();
  const { getBeatmapSet } = useBeatmapSetCacheContext();
  const { toast } = useToast();

  useEffect(() => {
    if (!data) {
      return;
    }

    const loadBeatmap = async () => {
      try {
        const beatmapSetFile = await getBeatmapSet(data.beatmapSetId);

        setLoadingMessage("Parsing Beatmap...");

        const beatmapData = await parseOsz(beatmapSetFile, data.beatmapId);

        setBeatmapData(beatmapData);
      } catch (error: any) {
        // I wish I could delete just enough beatmaps to make room, but
        // 1. The reported usage amount doesn't match the actual amount (security reasons)
        // 2. For some reason the reported amount doesn't update until you refresh
        // Sooo just purge the whole cache and get the user to refresh
        if (error.code === DOMException.QUOTA_EXCEEDED_ERR) {
          toast({
            title: "Warning",
            description:
              "IDB Storage quota exceeded, cache purged. Refresh whenever you get the chance.",
            duration: 10000,
          });
        } else {
          throw error;
        }
      }
    };

    loadBeatmap();
  }, [data, toast, getBeatmapSet]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (beatmapData) {
        URL.revokeObjectURL(beatmapData.backgroundUrl);
        URL.revokeObjectURL(beatmapData.songUrl);

        Object.values(beatmapData.sounds).forEach((sound) => {
          if (sound.url) {
            URL.revokeObjectURL(sound.url);
          }
        });
      }
    };
  }, [beatmapData]);

  const retry = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <main className="relative grid">
      {!beatmapData && (
        <div className="place-self-center text-center">
          <h1 className="text-5xl font-bold text-white">{loadingMessage}</h1>
        </div>
      )}
      {beatmapData && (
        <>
          <Image
            src={beatmapData.backgroundUrl}
            alt="Beatmap Background"
            fill
            className="-z-[1] select-none object-cover"
            style={{
              filter: `brightness(${1 - settings.backgroundDim})`,
            }}
          />

          <GameScreens key={key} beatmapData={beatmapData} retry={retry} />
        </>
      )}
    </main>
  );
};

export default GameModal;
