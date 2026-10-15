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
        // Hold the pinned hero on screen for a stretch of scroll (the next page starts
        // lower; the gap is transparent) so the pawn's trip to the star is seen.
        gsap.set(q(".hero + .page"), { marginTop: "70vh" });

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
          .timeline({ scrollTrigger: { trigger: q(".hero")[0], start: "clamp(bottom bottom)", end: () => `+=${innerHeight * 0.6}`, scrub: 0.8, invalidateOnRefresh: true } })
          .to(q(".hero-pawn"), {
            motionPath: { path: track, align: track, alignOrigin: [0.5, 0.5], autoRotate: true, start: 0.04, end: 1 },
            ease: "none",
          })
          // Phones see the board wider than the screen: pan with the pawn like a camera.
          // On desktop the board fits, so this is a no-op.
          .to(q(".hero-scene svg"), { x: () => innerWidth - q(".hero-scene svg")[0].getBoundingClientRect().width, ease: "none" }, 0)
          .to(q(".hero-star"), { rotation: 72, scale: 1.3, transformOrigin: "50% 50%", duration: 0.15, ease: "back.out(3)" })
          .call(() => {
            gsap.fromTo(q(".confetti"), { x: 0, y: 0, scale: 1, rotation: 0, autoAlpha: 1 }, {
              x: () => gsap.utils.random(-110, 110),
              y: () => gsap.utils.random(-100, 90),
              rotation: () => gsap.utils.random(-200, 200),
              scale: 0.3,
              autoAlpha: 0,
              duration: 1,
              ease: "power3.out",
              stagger: 0.012,
              overwrite: true,
            });
          });
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

        // Decorations bob in place and drift with scroll; deeper ones move further.
        gsap.to(q(".decor-float"), {
          y: "random(-14, 14)",
          rotation: "random(-6, 6)",
          duration: "random(2.4, 3.8)",
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
        });
        for (const el of q(".decor")) {
          const d = Number(el.dataset.depth) * 90;
          gsap.fromTo(el, { y: d }, {
            y: -d,
            ease: "none",
            scrollTrigger: { trigger: el.closest(".page"), start: "top bottom", end: "bottom top", scrub: true },
          });
        }

        // Every robot blinks now and then.
        gsap
          .timeline({ repeat: -1, repeatDelay: 2.8 })
          .to(q(".bot-eyes circle"), { scaleY: 0.1, transformOrigin: "50% 50%", duration: 0.08, yoyo: true, repeat: 1 });

        // Playful loops per page, running only while that page is on screen.
        for (const page of q(".page")) {
          const loops: gsap.core.Animation[] = [];
          for (const w of page.querySelectorAll<HTMLElement>(".walker")) {
            const off = -w.offsetWidth - 20;
            const end = () => page.offsetWidth + 20;
            const rev = w.dataset.reverse !== undefined;
            loops.push(
              gsap.fromTo(w, { x: rev ? end : off }, { x: rev ? off : end, duration: Number(w.dataset.dur), ease: "none", repeat: -1 }),
              gsap.to(w.querySelectorAll(".hop"), { y: -9, duration: 0.24, ease: "power1.out", stagger: { each: 0.09, repeat: -1, yoyo: true } }),
            );
            const roll = w.querySelectorAll(".roll");
            if (roll.length) loops.push(gsap.to(roll, { rotation: 360, transformOrigin: "50% 50%", duration: 0.9, ease: "none", repeat: -1 }));
          }
          page.querySelectorAll(".sticker").forEach((el) => {
            loops.push(
              gsap
                .timeline({ repeat: -1, repeatDelay: gsap.utils.random(0.6, 2.4), delay: gsap.utils.random(0, 2) })
                .fromTo(el, { scale: 0, rotation: -80, autoAlpha: 1 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" })
                .to(el, { scale: 0, rotation: 40, duration: 0.3, ease: "power2.in" }, "+=1.6"),
            );
          });
          page.querySelectorAll(".bubble").forEach((el, i) => {
            loops.push(
              gsap
                .timeline({ repeat: -1, repeatDelay: 2, delay: i * 1.3 })
                .fromTo(el, { y: 30, scale: 0.6, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: "back.out(2.5)" })
                .to(el, { y: -70, autoAlpha: 0, duration: 1.6, ease: "power1.in" }, "+=1.2"),
            );
          });
          if (!loops.length) continue;
          loops.forEach((t) => t.pause());
          ScrollTrigger.create({
            trigger: page,
            start: "top bottom",
            end: "bottom top",
            onToggle: (st) => loops.forEach((t) => (st.isActive ? t.resume() : t.pause())),
          });
        }

        // Stacked pages: pin each page once its bottom is in view (so tall pages are read
        // in full), let the next one slide over it, and dim it as it's covered.
        const pages = q(".page");
        pages.forEach((page, i) => {
          ScrollTrigger.create({ trigger: page, start: "bottom bottom", end: "max", pin: true, pinSpacing: false });
          // Dim only while the next page (or the footer) is actually sliding over it.
          gsap.to(page, {
            "--shade": 0.35,
            ease: "none",
            scrollTrigger: { trigger: pages[i + 1] ?? document.querySelector("footer"), start: "top bottom", end: "top top", scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
