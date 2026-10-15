"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

// Scroll choreography for the server-rendered landing page. Content stays in
// the HTML; this only animates it, and does nothing under reduced motion.
export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      gsap.set(q(".hero-scene"), { autoAlpha: 1 });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hero scene: board pieces pop in, then the pawn follows the track as you scroll.
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(q(".hero-blob"), { scale: 0.6, autoAlpha: 0, duration: 0.8, stagger: 0.12 })
          .from(q(".hero-track"), { drawSVG: 0, duration: 1.2, ease: "power2.inOut" }, "<0.2")
          .from(q(".hero-tile"), {
            scale: 0,
            rotation: () => gsap.utils.random(-35, 35),
            transformOrigin: "50% 50%",
            duration: 0.45,
            stagger: 0.06,
            ease: "back.out(2.4)",
          }, "<0.3")
          .from(q(".hero-star, .hero-pawn"), { scale: 0, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.1, ease: "back.out(3)" }, "-=0.2");

        const track = root.current!.querySelector<SVGPathElement>(".hero-guide")!;
        gsap
          .timeline({ scrollTrigger: { trigger: q(".hero-scene")[0], start: 0, end: "bottom 30%", scrub: 0.8 } })
          .to(q(".hero-pawn"), {
            motionPath: { path: track, align: track, alignOrigin: [0.5, 0.5], autoRotate: true, start: 0.04, end: 1 },
            ease: "none",
          })
          .to(q(".hero-star"), { rotation: 72, scale: 1.3, transformOrigin: "50% 50%", duration: 0.15, ease: "back.out(3)" });
        gsap.to(q(".hero-blob"), {
          yPercent: -30,
          ease: "none",
          scrollTrigger: { trigger: q(".hero-scene")[0], start: "top bottom", end: "bottom top", scrub: true },
        });

        // Everything else rises in as it enters the viewport.
        gsap.set(q(".reveal"), { autoAlpha: 0, y: 40 });
        ScrollTrigger.batch(q(".reveal"), {
          start: "top 88%",
          once: true,
          onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power3.out" }),
        });
        for (const node of q(".path-node svg")) {
          gsap.from(node, {
            scale: 0,
            rotation: -90,
            transformOrigin: "50% 50%",
            duration: 0.6,
            ease: "back.out(3)",
            scrollTrigger: { trigger: node, start: "top 95%" },
          });
        }

        // Stacked pages: pin each page once its bottom is in view (so tall pages are read
        // in full), let the next one slide over it, and dim it as it's covered.
        for (const page of q(".page")) {
          ScrollTrigger.create({ trigger: page, start: "bottom bottom", end: "max", pin: true, pinSpacing: false });
          gsap.to(page, {
            "--shade": 0.35,
            ease: "none",
            scrollTrigger: { trigger: page, start: "bottom bottom", end: () => `+=${innerHeight}`, scrub: true },
          });
        }
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
