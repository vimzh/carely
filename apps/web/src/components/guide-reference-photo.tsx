"use client";

import Image from "next/image";

const guidePhotos = {
  "tv-remote": {
    src: "/guide-assets/real-tv-remote-buttons.jpg",
    alt: "Close-up of a Vizio remote showing the Input, power, volume, channel, navigation, and number buttons",
    credit: "TaurusEmerald",
    creditHref: "https://commons.wikimedia.org/wiki/File:Vizio_XRT122_Remote.jpg",
    license: "CC BY-SA 4.0",
    licenseHref: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  oven: {
    src: "/guide-assets/real-oven-dial.jpg",
    alt: "Close-up of a cream oven dial marked Off, Low, and numbered 1 through 9",
    credit: "Acabashi",
    creditHref: "https://commons.wikimedia.org/wiki/File:Parkinson_Cowan_Prince_gas_cooker_Harlow_Museum_%26_Walled_Gardens,_Essex_crop.jpg",
    license: "CC BY 4.0",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
  },
  "microwave-panel": {
    src: "/guide-assets/real-microwave-operating-buttons.jpg",
    alt: "Front view of a white microwave control panel showing the number keys, Start button, and Clear Off button",
    credit: "Andy Melton",
    creditHref: "https://commons.wikimedia.org/wiki/File:GE_Profile_Spacemaker_Microwave.jpg",
    license: "CC BY-SA 2.0",
    licenseHref: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
} as const;

export function GuideReferencePhoto({ guideId, compact = false }: { guideId: string; compact?: boolean }) {
  const photo = guidePhotos[guideId as keyof typeof guidePhotos];
  if (!photo) return null;

  return (
    <figure className={compact ? "border-b bg-muted/20" : "max-w-3xl overflow-hidden rounded-md border bg-muted/20"}>
      <div className={compact ? "relative h-80" : "relative h-[min(65vh,38rem)]"}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={compact ? "(max-width: 768px) 100vw, 70vw" : "(max-width: 768px) 100vw, 768px"}
          className={compact ? "object-contain p-3" : "object-contain p-4 sm:p-6"}
        />
      </div>
      {!compact && (
        <figcaption className="border-t px-4 py-3 text-xs leading-5 text-muted-foreground">
          Photo: <a className="underline underline-offset-2 hover:text-foreground" href={photo.creditHref} target="_blank" rel="noreferrer">{photo.credit}</a>
          {" · "}
          <a className="underline underline-offset-2 hover:text-foreground" href={photo.licenseHref} target="_blank" rel="noreferrer">{photo.license}</a>
        </figcaption>
      )}
    </figure>
  );
}
