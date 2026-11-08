import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const F = React;
const e = jsxRuntime;
const y = gsap;
const ke = ScrollTrigger;
const pt = THREE.WebGLRenderer;
const ft = THREE.ACESFilmicToneMapping;
const mt = THREE.SRGBColorSpace;
const ut = THREE.Scene;
const gt = THREE.PMREMGenerator;
const Tt = RoomEnvironment;
const bt = THREE.PerspectiveCamera;
const et = THREE.DirectionalLight;
const xt = THREE.PCFSoftShadowMap;
const tt = THREE.Mesh;
const Rt = THREE.PlaneGeometry;
const wt = THREE.ShadowMaterial;
const vt = THREE.CanvasTexture;
const kt = THREE.RepeatWrapping;
const yt = THREE.MeshPhysicalMaterial;
const jt = THREE.Vector2;
const Nt = THREE.Color;
const Mt = THREE.BufferGeometry;
const ue = THREE.Vector3;
const zt = THREE.TubeGeometry;
const St = THREE.CatmullRomCurve3;

typeof window < "u" && y.registerPlugin(ke);
const qt =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Inter+Tight:wght@300..800&display=swap",
  J = (o, d = 1400, m = 0) =>
    "https://images.pexels.com/photos/" +
    o +
    "/pexels-photo-" +
    o +
    ".jpeg?auto=compress&cs=tinysrgb&w=" +
    d +
    (m ? "&h=" + m + "&fit=crop" : ""),
  Me = (o, d) =>
    "https://videos.pexels.com/video-files/" +
    o +
    "/" +
    o +
    "-" +
    d +
    "_30fps.mp4",
  Ct = 48,
  Pt = "https://videos.pexels.com/video-files/19457509/19457509-hd_1920_1080_30fps.mp4",
  ot = Me(19457370, "hd_1920_1080"),
  Et = [
    {
      name: "Mallow",
      kind: "Skincare identity",
      year: "2026",
      img: J(4841519, 1e3),
    },
    {
      name: "Arcadia",
      kind: "Architecture website",
      year: "2026",
      img: J(21849253, 1e3),
    },
    {
      name: "Halcyon",
      kind: "Meditation app",
      year: "2025",
      img: J(29612114, 1e3),
    },
    {
      name: "Pebble",
      kind: "Savings brand",
      year: "2025",
      img: J(15863490, 1e3),
    },
    {
      name: "Casa Rosa",
      kind: "Hotel website",
      year: "2025",
      img: J(11116100, 1e3),
    },
    {
      name: "Fold",
      kind: "Packaging system",
      year: "2024",
      img: J(36339062, 1e3),
    },
    {
      name: "Prism",
      kind: "Design system",
      year: "2024",
      img: J(29579757, 1e3),
    },
  ],
  At = [
    {
      tint: "var(--or-warm)",
      title: "We make good ideas feel obvious",
      text: "Strategy, identity and product live in one small room here, so the idea that starts a project is the one that ships.",
      clip: Me(15863510, "sd_960_540"),
    },
    {
      tint: "var(--or-mint)",
      title: "Small studio, long memory",
      text: "Eleven designers, two engineers, one long table. Most of the teams we work with have stayed for more than three years.",
      clip: Me(15863511, "sd_960_540"),
    },
    {
      tint: "var(--or-lilac-soft)",
      title: "Calm is a craft",
      text: "We take things away until nothing is left to argue with, then tune the half-second that makes it feel alive.",
      clip: Me(19493166, "sd_960_540"),
    },
  ],
  rt = [
    33866498, 15946547, 29852852, 11824896, 38197025, 14669406, 19456417,
    36439572, 31530222,
  ],
  It = [
    "Brand systems",
    "Product interfaces",
    "Apps that travel",
    "Motion & 3D",
  ],
  at = [
    { name: "Mira", c: "#f08a7e", x: -38, y: -20 },
    { name: "Jonas", c: "#7c8cff", x: 36, y: -17 },
    { name: "Ade", c: "#3fbf8f", x: 38, y: 8 },
    { name: "Lin", c: "#c58cf2", x: -40, y: 12 },
    { name: "Tomás", c: "#f2b84b", x: -14, y: 22 },
    { name: "Priya", c: "#4fb7e8", x: 18, y: 23 },
  ],
  Wt = [
    "In fintech",
    "In health",
    "In hospitality",
    "In climate",
    "In retail",
    "In education",
  ],
  Fe = [
    "Mallow",
    "Arcadia",
    "Halcyon",
    "Pebble",
    "Casa Rosa",
    "Fold",
    "Prism",
    "Fernhill",
    "Lumen",
    "Tidepool",
  ],
  Lt = [
    "Brand identity",
    "Product design",
    "Website",
    "Motion & 3D",
    "Design system",
    "Something else",
  ],
  it = ["< $20k", "$20–50k", "$50–100k", "$100k +"],
  ge = [
    { id: "home", label: "Home", tone: "light" },
    { id: "about", label: "About", tone: "light" },
    { id: "make", label: "What we make", tone: "light" },
    { id: "people", label: "People", tone: "light" },
    { id: "quote", label: "Belief", tone: "dark" },
    { id: "work", label: "Work", tone: "dark" },
    { id: "proof", label: "Proof", tone: "light" },
    { id: "rope", label: "Process", tone: "dark" },
    { id: "contact", label: "Contact", tone: "light" },
  ],
  Bt = 260,
  Ot = 170,
  _e = 700;
function Ht(o, d, m) {
  return d === 1 ? o * 32 : d === 2 ? o * m : o;
}
function Dt(o, d, m, b) {
  const O = 1 - Math.pow(1 - m, Math.min(b, 64) / 16.666666666666668),
    S = o + (d - o) * O;
  return Math.abs(d - S) < 0.3 ? d : S;
}
function Ft(o, d, m, b, O, S, P = 1 / 0) {
  if (d > 0) {
    if (m < b - 1.5)
      return { target: Math.min(b, o.target + d * S, m + P), push: 0, turn: 0 };
    const g = Math.max(0, o.push) + d;
    return g >= O
      ? { target: b, push: 0, turn: 1 }
      : { target: b, push: g, turn: 0 };
  }
  if (d < 0) {
    if (m > 1.5)
      return { target: Math.max(0, o.target + d * S, m - P), push: 0, turn: 0 };
    const g = Math.min(0, o.push) + d;
    return g <= -O
      ? { target: 0, push: 0, turn: -1 }
      : { target: 0, push: g, turn: 0 };
  }
  return { target: o.target, push: o.push, turn: 0 };
}
function _t(o, d, m) {
  const b = o + d;
  return b < 0 || b >= m ? -1 : b;
}
function Le(o, d, m) {
  return o < m && d >= m ? 1 : o >= m && d < m ? -1 : 0;
}
function Yt(o, d, m) {
  return Math.min(1, Math.max(0, (o - d) / (m - d)));
}
function Gt(o, d) {
  let m = -1;
  for (let b = 0; b < d.length; b++) o >= d[b] && (m = b);
  return m;
}
function Vt(o, d) {
  return Math.max(0, Math.min(d, Math.ceil((o / 0.95) * d)));
}
function nt(o, d) {
  return ((o % d) + d) % d;
}
function Xt(o, d, m) {
  let b = nt(o - d, m);
  return (b > m / 2 && (b -= m), b);
}
function Zt(o, d, m) {
  return o === "ArrowDown" || o === "PageDown" || (o === " " && !d)
    ? { kind: "step", to: 1 }
    : o === "ArrowUp" || o === "PageUp" || (o === " " && d)
      ? { kind: "step", to: -1 }
      : o === "Home"
        ? { kind: "jump", to: 0 }
        : o === "End"
          ? { kind: "jump", to: m - 1 }
          : /^[1-9]$/.test(o) && +o <= m
            ? { kind: "jump", to: +o - 1 }
            : null;
}
function Ut(o, d) {
  return o === "about" && d === "make";
}
function Kt(o) {
  return o === "dark" ? "light" : "dark";
}
const $ = (...o) => o.filter(Boolean).join(" ");
function ne({ text: o, hidden: d }) {
  const m = o.split(" ");
  let b = 0;
  return e.jsxs(e.Fragment, {
    children: [
      !d && e.jsx("span", { className: "or-sr", children: o }),
      e.jsx("span", {
        className: "or-spell",
        "aria-hidden": "true",
        "data-spell": "",
        children: m.map((O, S) =>
          e.jsxs(
            F.Fragment,
            {
              children: [
                e.jsx("span", {
                  className: "or-w",
                  children: [...O].map((P, g) =>
                    e.jsx(
                      "span",
                      { className: "or-l", style: { "--i": b++ }, children: P },
                      g,
                    ),
                  ),
                }),
                S < m.length - 1 ? " " : null,
              ],
            },
            S,
          ),
        ),
      }),
    ],
  });
}
function pe({ children: o }) {
  return e.jsxs("span", {
    className: "or-roll",
    children: [
      e.jsx("span", { className: "or-roll-s", children: o }),
      e.jsxs("span", {
        className: "or-roll-t",
        "aria-hidden": "true",
        children: [
          e.jsx("span", { children: o }),
          e.jsx("span", { children: o }),
        ],
      }),
    ],
  });
}
function Ce({ src: o, className: d }) {
  return e.jsx("video", {
    className: $("or-vid", d),
    src: o,
    muted: !0,
    loop: !0,
    playsInline: !0,
    preload: "none",
    "aria-hidden": "true",
    tabIndex: -1,
  });
}
function Pe({ className: o }) {
  return e.jsxs("svg", {
    viewBox: "0 0 24 28",
    className: o,
    "aria-hidden": "true",
    children: [
      e.jsx("path", {
        d: "M3 26.5V12a9 9 0 0 1 18 0v14.5Z",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.6",
      }),
      e.jsx("path", {
        d: "M12 4v22.5M3 15.5h18",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.2",
      }),
    ],
  });
}
function Qt() {
  return e.jsxs("svg", {
    viewBox: "0 0 140 140",
    className: "or-eye",
    "aria-hidden": "true",
    children: [
      e.jsxs("defs", {
        children: [
          e.jsx("path", {
            id: "or-ring",
            d: "M70 70m-55 0a55 55 0 1 1 110 0a55 55 0 1 1 -110 0",
          }),
          e.jsx("clipPath", {
            id: "or-almond",
            children: e.jsx("path", { d: "M40 70Q70 44 100 70Q70 96 40 70Z" }),
          }),
        ],
      }),
      e.jsx("g", {
        className: "or-eye-ring",
        children: e.jsx("text", {
          children: e.jsx("textPath", {
            href: "#or-ring",
            startOffset: "0",
            children: "CAMPUSAXIS · SCROLL DOWN · SEE WHAT WE MAKE ·",
          }),
        }),
      }),
      e.jsx("g", {
        className: "or-lash",
        children: e.jsx("path", {
          d: "M55 52l-3-6M70 49v-7M85 52l3-6M47 58l-5-4M93 58l5-4",
        }),
      }),
      e.jsx("path", { d: "M40 70Q70 44 100 70Q70 96 40 70Z", fill: "#fff" }),
      e.jsxs("g", {
        clipPath: "url(#or-almond)",
        children: [
          e.jsxs("g", {
            className: "or-iris",
            children: [
              e.jsx("circle", { cx: "70", cy: "70", r: "13", fill: "#dad2f4" }),
              e.jsx("circle", { cx: "70", cy: "70", r: "7", fill: "#17171a" }),
              e.jsx("circle", { cx: "73", cy: "67", r: "2", fill: "#fff" }),
            ],
          }),
          e.jsx("rect", {
            className: "or-lid or-lid-t",
            x: "38",
            y: "42",
            width: "64",
            height: "29",
          }),
          e.jsx("rect", {
            className: "or-lid or-lid-b",
            x: "38",
            y: "69",
            width: "64",
            height: "29",
          }),
        ],
      }),
      e.jsx("path", {
        d: "M40 70Q70 44 100 70Q70 96 40 70Z",
        fill: "none",
        stroke: "#17171a",
        strokeWidth: "2.4",
        strokeLinejoin: "round",
      }),
    ],
  });
}
function st() {
  return e.jsx("span", {
    className: "or-stars",
    "aria-hidden": "true",
    children: [0, 1, 2, 3, 4].map((o) =>
      e.jsx(
        "svg",
        {
          viewBox: "0 0 20 20",
          children: e.jsx("path", {
            d: "M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.8Z",
          }),
        },
        o,
      ),
    ),
  });
}
function $t({ projects: o }) {
  const [d, m] = F.useState(0),
    b = o.length,
    O = F.useRef(null),
    S = (g) => m((D) => nt(D + g, b)),
    P = o[d];
  return e.jsxs("div", {
    className: "or-car",
    role: "region",
    "aria-roledescription": "carousel",
    "aria-label": "Selected work",
    onPointerDown: (g) => (O.current = g.clientX),
    onPointerUp: (g) => {
      if (O.current == null) return;
      const D = g.clientX - O.current;
      ((O.current = null), Math.abs(D) > 40 && S(D < 0 ? 1 : -1));
    },
    onKeyDown: (g) => {
      (g.key === "ArrowRight" && (S(1), g.preventDefault()),
        g.key === "ArrowLeft" && (S(-1), g.preventDefault()));
    },
    children: [
      e.jsx("div", {
        className: "or-car-ring",
        children: o.map((g, D) => {
          const N = Xt(D, d, b);
          return e.jsxs(
            "figure",
            {
              className: $("or-car-card", N === 0 && "is-on"),
              style: { "--d": N, opacity: Math.abs(N) > 1 ? 0 : 1 },
              "aria-hidden": N !== 0,
              onClick: () => N && S(N),
              children: [
                e.jsx("img", {
                  src: g.img,
                  alt: g.name + ", " + g.kind,
                  draggable: !1,
                }),
                e.jsxs("figcaption", {
                  className: "or-car-meta",
                  children: [
                    e.jsx("span", { children: g.kind }),
                    e.jsx("span", { children: g.year }),
                  ],
                }),
              ],
            },
            g.name,
          );
        }),
      }),
      e.jsx(
        "h3",
        {
          className: "or-car-title",
          "aria-live": "polite",
          children: e.jsx(ne, { text: P.name }),
        },
        P.name,
      ),
      e.jsxs("div", {
        className: "or-car-foot",
        children: [
          e.jsx("div", {
            className: "or-car-bars",
            "aria-hidden": "true",
            children: o.map((g, D) =>
              e.jsx("span", { className: $(D === d && "is-on") }, g.name),
            ),
          }),
          e.jsxs("span", {
            className: "or-car-count",
            children: [
              String(d + 1).padStart(2, "0"),
              " / ",
              String(b).padStart(2, "0"),
            ],
          }),
          e.jsx("button", {
            type: "button",
            className: "or-car-btn",
            "data-mag": "",
            "data-cursor": "nav",
            "aria-label": "Previous project",
            onClick: () => S(-1),
            children: "←",
          }),
          e.jsx("button", {
            type: "button",
            className: "or-car-btn",
            "data-mag": "",
            "data-cursor": "nav",
            "aria-label": "Next project",
            onClick: () => S(1),
            children: "→",
          }),
        ],
      }),
    ],
  });
}
function Jt({ email: o, onClose: d }) {
  const [m, b] = F.useState(["Product design"]),
    [O, S] = F.useState(it[1]),
    [P, g] = F.useState(!1),
    D = (N) =>
      b((Z) => (Z.includes(N) ? Z.filter((le) => le !== N) : [...Z, N]));
  return e.jsxs("form", {
    className: $("or-form", P && "is-sent"),
    onSubmit: (N) => {
      (N.preventDefault(), g(!0));
    },
    children: [
      d &&
      e.jsx("button", {
        type: "button",
        className: "or-sheet-x",
        "aria-label": "Close the form",
        onClick: d,
        children: "×",
      }),
      e.jsxs("div", {
        className: "or-form-row",
        "data-rise": "",
        children: [
          e.jsxs("label", {
            className: "or-field",
            children: [
              e.jsx("span", { children: "Name & company" }),
              e.jsx("input", {
                name: "name",
                autoComplete: "name",
                placeholder: "Ines from Mallow",
                required: !0,
              }),
            ],
          }),
          e.jsxs("label", {
            className: "or-field",
            children: [
              e.jsx("span", { children: "Your email" }),
              e.jsx("input", {
                name: "email",
                type: "email",
                autoComplete: "email",
                placeholder: "you@" + o.split("@")[1],
                required: !0,
              }),
            ],
          }),
        ],
      }),
      e.jsxs("fieldset", {
        className: "or-chips",
        "data-rise": "",
        children: [
          e.jsx("legend", { children: "I'm interested in…" }),
          Lt.map((N) =>
            e.jsxs(
              "label",
              {
                className: $("or-chip", "or-rl", m.includes(N) && "is-on"),
                "data-cursor": "nav",
                children: [
                  e.jsx("input", {
                    type: "checkbox",
                    checked: m.includes(N),
                    onChange: () => D(N),
                  }),
                  e.jsx(pe, { children: N }),
                ],
              },
              N,
            ),
          ),
        ],
      }),
      e.jsxs("fieldset", {
        className: "or-chips",
        "data-rise": "",
        children: [
          e.jsx("legend", { children: "Project budget (USD)" }),
          it.map((N) =>
            e.jsxs(
              "label",
              {
                className: $("or-chip", "or-rl", O === N && "is-on"),
                "data-cursor": "nav",
                children: [
                  e.jsx("input", {
                    type: "radio",
                    name: "budget",
                    checked: O === N,
                    onChange: () => S(N),
                  }),
                  e.jsx(pe, { children: N }),
                ],
              },
              N,
            ),
          ),
        ],
      }),
      e.jsxs("label", {
        className: "or-field or-field-wide",
        "data-rise": "",
        children: [
          e.jsx("span", { children: "Tell us about it" }),
          e.jsx("textarea", {
            name: "brief",
            rows: 2,
            placeholder: "What are you making, and what should it feel like?",
          }),
        ],
      }),
      e.jsxs("div", {
        className: "or-submit-row",
        "data-rise": "",
        children: [
          e.jsxs("span", {
            className: "or-pulse",
            "data-mag": "",
            "data-cursor": "button",
            children: [
              e.jsx("i", {}),
              e.jsx("i", {}),
              e.jsx("i", {}),
              e.jsx("i", {}),
              e.jsxs("button", {
                type: "submit",
                className: "or-submit",
                children: [
                  e.jsx("span", { children: "Send" }),
                  " ",
                  e.jsx("span", { children: "the" }),
                  " ",
                  e.jsx("span", { children: "brief" }),
                ],
              }),
            ],
          }),
          e.jsx("p", {
            className: "or-sent",
            role: "status",
            children: P
              ? "Thank you. We answer every brief within two working days."
              : "",
          }),
        ],
      }),
    ],
  });
}
function eo({
  brand: o = "CampusAxis",
  headline:
  d = "A small design studio making calm, considered products and brands that people come back to",
  projects: m = Et,
  email: b = "hello@campusaxis.com",
  height: O = "100svh",
  theme: S = "auto",
  fontHref: P = qt,
  ropeFrames: g,
  className: D,
}) {
  const N = F.useRef(null),
    Z = F.useRef(null),
    [le, be] = F.useState("deck"),
    [E, Ee] = F.useState(!1),
    [ie, xe] = F.useState(S === "dark"),
    [ee, fe] = F.useState(!1),
    [Ae, Re] = F.useState(0),
    [de, ze] = F.useState(!1);
  (F.useLayoutEffect(() => {
    const t = N.current,
      l = window.matchMedia("(hover: hover) and (pointer: fine)"),
      n = window.matchMedia("(prefers-reduced-motion: reduce)"),
      j = () => {
        (Ee(n.matches),
          be(
            l.matches && !n.matches && t.parentElement.clientWidth >= 760
              ? "deck"
              : "stack",
          ),
          xe(S === "dark" || (S === "auto" && !!t.closest(".dark"))));
      };
    j();
    const f = new ResizeObserver(j);
    return (
      f.observe(t.parentElement),
      l.addEventListener("change", j),
      n.addEventListener("change", j),
      () => {
        (f.disconnect(),
          l.removeEventListener("change", j),
          n.removeEventListener("change", j));
      }
    );
  }, [S]),
    F.useLayoutEffect(() => {
      const t = N.current,
        l = le === "deck",
        n = (C, I = t) => I.querySelector(C),
        j = (C, I = t) => [...I.querySelectorAll(C)],
        f = j(".or-scene"),
        z = n(".or-probe"),
        v = () => z.getBoundingClientRect().width,
        _ = n(".or-header"),
        re = f.length,
        T = [],
        q = (C, I, V, K) => {
          (C.addEventListener(I, V, K),
            T.push(() => C.removeEventListener(I, V, K)));
        },
        a = {
          active: 0,
          cur: 0,
          target: 0,
          push: 0,
          written: 0,
          busyUntil: 0,
          lastWheel: 0,
          stale: !1,
          changedAt: 0,
          tone: [],
          bake: () => { },
          ln: [],
          lt: [],
        },
        Y = (C) => (ie ? "dark" : (a.tone[C] ?? ge[C].tone)),
        G = j(".or-rail button"),
        U = (C) => {
          (_.setAttribute("data-tone", C ?? Y(a.active)),
            G.forEach((I, V) => I.classList.toggle("is-on", V === a.active)));
        },
        je = (C, I) => {
          a.tone[C] !== I && ((a.tone[C] = I), C === a.active && U());
        };
      t.classList.add("or-live");
      const Ie = y.context(() => {
        const C = (i) => (l ? i : window),
          I = (i, r, s, u, c) => {
            if (E) {
              (s.progress(u), c == null || c(u));
              return;
            }
            ke.create({
              trigger: r,
              scroller: C(f[i]),
              start: "top top",
              end: "bottom bottom",
              scrub: !0,
              animation: s,
              invalidateOnRefresh: !0,
              onUpdate: c && ((h) => c(h.progress)),
              onRefresh: c && ((h) => c(h.progress)),
            });
          },
          V = () => t.clientWidth,
          K = () => (l ? t.clientHeight : window.innerHeight);
        {
          const i = n(".or-reel-track"),
            r = n(".or-reel-mask");
          (l &&
            !E &&
            y.fromTo(
              r,
              {
                clipPath: () =>
                  "inset(0px " +
                  9.375 * v() +
                  "px " +
                  Math.max(0, K() - 40 * v()) +
                  "px " +
                  9.375 * v() +
                  "px round " +
                  1.6 * v() +
                  "px)",
              },
              {
                clipPath: "inset(0px 0px 0px 0px round 0px)",
                duration: 0.9,
                ease: "power3.inOut",
                scrollTrigger: {
                  trigger: i,
                  scroller: f[0],
                  start: 12,
                  end: "max",
                  toggleActions: "play none none reverse",
                  invalidateOnRefresh: !0,
                },
              },
            ),
            E ||
            (y.fromTo(
              n(".or-reel-in"),
              { clipPath: "inset(0% 0% 100% 0%)" },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 3,
                ease: "power2.inOut",
                delay: 0.2,
              },
            ),
              y.from(n(".or-eye"), {
                scale: 0.3,
                opacity: 0,
                duration: 2,
                ease: "power3.out",
                delay: 0.4,
              }),
              y.from(_, {
                yPercent: -100,
                duration: 0.5,
                ease: "power2.out",
              })));
        }
        {
          const r = n(".or-about-track"),
            s = n(".or-about-row"),
            u = n(".or-stage", r);
          if (l && !E) {
            const c = () => Math.max(0, s.scrollWidth - u.clientWidth),
              h = () => (r.style.height = c() + u.clientHeight + "px");
            h();
            const p = new ResizeObserver(() => (h(), ke.refresh()));
            (p.observe(s), T.push(() => p.disconnect()));
            const k = y.to(s, {
              x: () => -c(),
              ease: "none",
              scrollTrigger: {
                trigger: r,
                scroller: f[1],
                start: "top top",
                end: "bottom bottom",
                scrub: !0,
                invalidateOnRefresh: !0,
              },
            });
            j(".or-card", s).forEach((w) => {
              const x = n(".or-card-pill", w);
              y.fromTo(
                x,
                { x: () => w.clientWidth - x.offsetWidth - 2 * x.offsetLeft },
                {
                  x: 0,
                  ease: "none",
                  scrollTrigger: {
                    trigger: w,
                    containerAnimation: k,
                    start: "left 85%",
                    end: "left 10%",
                    scrub: !0,
                    invalidateOnRefresh: !0,
                  },
                },
              );
            });
          }
        }
        {
          const r = n(".or-make"),
            s = n(".or-make-track"),
            u = n(".or-make-media", r),
            c = n(".or-mock", r),
            h = n(".or-slot video", r),
            p = n("video", u),
            k = (L, A, X, we, me) =>
              "inset(" +
              L +
              "px " +
              A +
              "px " +
              X +
              "px " +
              we +
              "px round " +
              me +
              "px)",
            w = () => {
              const L = n(".or-slot", r).getBoundingClientRect(),
                A = r.getBoundingClientRect();
              return k(
                L.top - A.top,
                A.right - L.right,
                A.bottom - L.bottom,
                L.left - A.left,
                (l ? 1 : 0.34) * v(),
              );
            },
            x = l ? 1 : 0.45,
            M = y.timeline({ paused: !0, defaults: { ease: "none" } });
          (M.fromTo(
            n(".or-make-word", r),
            { x: 0, scale: 1 },
            { x: () => -0.22 * V(), scale: 0.42, opacity: 0, duration: 0.14 },
            0,
          )
            .fromTo(
              u,
              { clipPath: () => k(0.3 * K(), 0, 0.3 * K(), V(), 2 * v()) },
              {
                clipPath: () =>
                  k(0.24 * K(), 0.05 * V(), 0.24 * K(), 0.66 * V(), 2.4 * v()),
                duration: 0.07,
              },
              0.01,
            )
            .to(u, { clipPath: () => k(0, 0, 0, 0, 0), duration: 0.09 }, 0.08)
            .to(u, { clipPath: w, duration: 0.11, ease: "power1.inOut" }, 0.21)
            .set(c, { autoAlpha: 1 }, 0.2)
            .set(u, { autoAlpha: 0 }, 0.45)
            .fromTo(
              n(".or-skel", c),
              { opacity: 1 },
              { opacity: 0, duration: 0.06 },
              0.38,
            )
            .fromTo(
              n(".or-mock-in", c),
              { opacity: 0 },
              { opacity: 1, duration: 0.06 },
              0.38,
            )
            .fromTo(
              n(".or-make-light", r),
              { opacity: 0 },
              { opacity: 1, duration: 0.06 },
              0.46,
            )
            .fromTo(
              c,
              { width: () => 66 * v(), borderRadius: () => 2.25 * v() },
              {
                width: () => 22 * v(),
                borderRadius: () => 3.4 * v(),
                duration: 0.16,
                ease: "power1.inOut",
              },
              0.64,
            )
            .fromTo(
              n(".or-notch", c),
              { opacity: 0 },
              { opacity: 1, duration: 0.04 },
              0.76,
            ),
            j(".or-cur", r).forEach((L, A) => {
              const X = at[A];
              M.fromTo(
                L,
                {
                  x: () => X.x * 1.9 * x * v(),
                  y: () => X.y * 2.4 * x * v(),
                  opacity: 0,
                },
                {
                  x: () => X.x * x * v(),
                  y: () => X.y * x * v(),
                  opacity: 1,
                  duration: 0.09,
                  ease: "power2.out",
                },
                0.5 + A * 0.012,
              )
                .to(
                  L,
                  {
                    x: () => (X.x * 0.55 + (A % 2 ? 4 : -4)) * x * v(),
                    y: () => (X.y * 0.9 + (A % 3) * 2) * x * v(),
                    duration: 0.2,
                  },
                  0.62,
                )
                .to(
                  L,
                  { x: () => X.x * 2.2 * x * v(), opacity: 0, duration: 0.07 },
                  0.9,
                );
            }));
          const H = n(".or-tag", r),
            Q = j(".or-tag-l", H),
            W = [0.3, 0.47, 0.64, 0.82];
          let ae = -2;
          I(2, s, M, 0.6, (L) => {
            const A = Gt(L, W);
            if (A === ae) return;
            const X = A > ae;
            (y.to(
              H,
              A < 0
                ? { opacity: 0, scale: 0.5, duration: 0.3 }
                : {
                  opacity: 1,
                  scale: 1,
                  duration: 0.5,
                  ease: "back.out(1.6)",
                },
            ),
              Q.forEach((we, me) => {
                me === A
                  ? y.fromTo(
                    we,
                    { yPercent: X ? 100 : -100, opacity: 0 },
                    {
                      yPercent: 0,
                      opacity: 1,
                      duration: 0.45,
                      ease: "power3.out",
                    },
                  )
                  : me === ae
                    ? y.to(we, {
                      yPercent: X ? -100 : 100,
                      opacity: 0,
                      duration: 0.45,
                      ease: "power3.in",
                    })
                    : y.set(we, { opacity: 0 });
              }),
              (ae = A),
              p &&
              h &&
              L > 0.3 &&
              Math.abs(h.currentTime - p.currentTime) > 0.3 &&
              (h.currentTime = p.currentTime));
          });
        }
        {
          const r = n(".or-people"),
            s = n(".or-gap", r),
            u = j(".or-ava > *", r),
            c = n(".or-gap-word", r),
            h = y.timeline({ paused: !0, defaults: { ease: "none" } }),
            p = n(".or-ava", r);
          (h
            .set(u, { scale: 0 }, 0)
            .set(c, { opacity: 0 }, 0)
            .set(p, { opacity: 0, scaleX: 0.2 }, 0)
            .set(j(".or-fly", r), { y: () => K() }, 0)
            .fromTo(
              s,
              { width: 0 },
              {
                width: () => p.scrollWidth,
                duration: 0.14,
                ease: "power2.inOut",
              },
              0.06,
            )
            .to(
              p,
              {
                opacity: 1,
                scaleX: 1,
                transformOrigin: "0% 50%",
                duration: 0.14,
                ease: "power2.inOut",
              },
              0.06,
            )
            .fromTo(
              u,
              { scale: 0 },
              { scale: 1, duration: 0.06, stagger: 0.008, ease: "back.out(2)" },
              0.1,
            )
            .to(
              u,
              {
                y: () => -5 * v(),
                scale: 0.5,
                opacity: 0,
                duration: 0.07,
                stagger: 0.006,
              },
              0.32,
            )
            .to(p, { opacity: 0, duration: 0.05 }, 0.37)
            .to(
              s,
              {
                width: () => c.offsetWidth,
                duration: 0.1,
                ease: "power2.inOut",
              },
              0.36,
            )
            .fromTo(
              c,
              { scale: 0.5, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.08 },
              0.38,
            ),
            j(".or-fly", r).forEach((x, M) => {
              h.fromTo(
                x,
                { y: () => K() * (0.7 + M * 0.1), rotate: [-20, 14, -8][M] },
                {
                  y: () => -K() * (0.9 + M * 0.15),
                  rotate: [60, -50, 40][M],
                  duration: 0.45,
                },
                0.18 + M * 0.06,
              );
            }));
          const k = n(".or-swallow", r);
          h.fromTo(
            k,
            { x: () => 0.7 * V(), scale: 0.18, rotate: 0 },
            { x: 0, scale: 1, rotate: -120, duration: 0.16, ease: "power2.in" },
            0.82,
          );
          let w = 0;
          I(3, n(".or-people-track"), h, 0.5, (x) => {
            (Le(w, x, 0.93) && je(3, x >= 0.93 ? "dark" : void 0), (w = x));
          });
        }
        {
          const r = j(".or-q .or-l"),
            s = n(".or-qbar i");
          let u = -1;
          const c = (h) => {
            const p = Vt(h, r.length);
            p !== u &&
              (r.forEach((k, w) => k.classList.toggle("is-lit", w < p)),
                (u = p),
                (s.style.transform = "scaleY(" + h + ")"));
          };
          (I(
            4,
            n(".or-quote-track"),
            y.timeline({ paused: !0 }).to({}, { duration: 1 }),
            1,
            c,
          ),
            E ||
            y.from(j(".or-ring-c"), {
              opacity: 0,
              scale: 0.9,
              duration: 0.6,
              stagger: 0.2,
              delay: 0.3,
              paused: l,
              id: "rings",
            }));
        }
        {
          const r = n(".or-work"),
            s = n(".or-thread path", r),
            u = y.timeline({ paused: !0, defaults: { ease: "none" } }),
            c = n(".or-slit", r);
          u.fromTo(
            n(".or-work-lift", r),
            { y: 0 },
            { y: () => -1.15 * K(), duration: 0.36, ease: "power1.in" },
            0.1,
          )
            .fromTo(
              n(".or-hand", r),
              { scale: 1 },
              { scale: 0, duration: 0.2, ease: "power2.in" },
              0.32,
            )
            .fromTo(
              s,
              { strokeDashoffset: 1, opacity: 1 },
              { strokeDashoffset: 0, duration: 0.2 },
              0.34,
            )
            .fromTo(
              c,
              { scaleY: 0, scaleX: () => 1.5 / V() },
              { scaleY: 1, duration: 0.12, ease: "power2.in" },
              0.54,
            )
            .to(s, { opacity: 0, duration: 0.05 }, 0.64)
            .to(c, { scaleX: 1, duration: 0.24, ease: "power3.in" }, 0.72);
          let h = 0;
          l &&
            I(5, n(".or-work-track"), u, 0, (p) => {
              (Le(h, p, 0.9) && je(5, p >= 0.9 ? "light" : void 0), (h = p));
            });
        }
        {
          const r = y.timeline({ paused: !0, defaults: { ease: "none" } });
          (r.fromTo(
            n(".or-cube"),
            { rotateY: 16 },
            { rotateY: -90, duration: 0.6, ease: "power1.inOut" },
            0.2,
          ),
            I(6, n(".or-proof-track"), r, 1));
        }
        {
          const r = n(".or-rope"),
            s = n(".or-squircle", r),
            u = to(
              n(".or-rope-c", r),
              l ? Math.min(2, window.devicePixelRatio) : 1,
            );
          T.push(u.dispose);
          const c = n(".or-idea", r),
            h = j(".or-l", c),
            p = y.timeline({ paused: !0, defaults: { ease: "none" } });
          p.fromTo(
            n(".or-rope-bg path", r),
            { strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: 0.36 },
            0,
          )
            .fromTo(
              s,
              {
                width: () => (l ? 28 : 20) * v(),
                height: () => (l ? 19 : 14) * v(),
                borderRadius: () => (l ? 7 : 4.5) * v(),
                y: 0,
              },
              {
                width: () => V() - 3 * v(),
                height: () => K() - 7.5 * v(),
                borderRadius: () => 4 * v(),
                y: () => -1.5 * v(),
                duration: 0.28,
                ease: "power2.inOut",
              },
              0.58,
            )
            .fromTo(
              n(".or-rope-fill", r),
              { opacity: 0 },
              { opacity: 1, duration: 0.2 },
              0.62,
            )
            .fromTo(
              n(".or-rope-line", r),
              { opacity: 1, y: 0 },
              { opacity: 0, y: () => -6 * v(), duration: 0.12 },
              0.5,
            )
            .fromTo(
              n(".or-marq", r),
              { opacity: 0 },
              { opacity: 1, duration: 0.1 },
              0.8,
            );
          const k = n(".or-rope-seq", r),
            w = k.getContext("2d");
          let x = null;
          const M = new Map();
          let H = [0, 1],
            Q = -1,
            W = 0;
          const ae = (B) => {
            if (!x) return;
            const se = Math.round(W * (x.length - 1));
            if (se === Q && !B) return;
            Q = se;
            const ce = k.clientWidth,
              Ne = k.clientHeight,
              he = x[se];
            if (he instanceof Blob) {
              const ve = M.get(se);
              if (!ve) {
                createImageBitmap(he).then((Je) => {
                  if (!L) return Je.close();
                  M.set(se, Je);
                  for (const De of M.keys())
                    M.size > 8 &&
                      Math.abs(De - Q) > 4 &&
                      (M.get(De).close(), M.delete(De));
                  Q === se && ae(!0);
                });
                return;
              }
              (w.clearRect(0, 0, ce, Ne),
                w.drawImage(ve, 0, H[0] * Ne, ce, (H[1] - H[0]) * Ne));
              return;
            }
            if ((w.clearRect(0, 0, ce, Ne), g)) {
              const ve = Math.max(
                ce / he.naturalWidth,
                Ne / he.naturalHeight,
              );
              w.drawImage(
                he,
                (ce - he.naturalWidth * ve) / 2,
                (Ne - he.naturalHeight * ve) / 2,
                he.naturalWidth * ve,
                he.naturalHeight * ve,
              );
            }
          },
            oe = () => {
              const B = l ? Math.min(2, window.devicePixelRatio) : 1;
              ((k.width = k.clientWidth * B),
                (k.height = k.clientHeight * B),
                w.setTransform(B, 0, 0, B, 0, 0),
                (w.imageSmoothingQuality = "high"),
                ae(!0));
            };
          let L = !0;
          T.push(() => {
            ((L = !1), M.forEach((B) => B.close()));
          });
          const A = async () => {
            if (g != null && g.length) {
              const B = await Promise.all(
                g.map((se) => {
                  const ce = new Image();
                  return (
                    (ce.decoding = "async"),
                    (ce.src = se),
                    ce.decode().then(() => ce)
                  );
                }),
              );
              if (!L) return;
              x = B;
            } else {
              const B = await u.bake(l ? Ct : 28);
              if (!L) return;
              ((x = B.frames), (H = B.band));
            }
            (r.classList.add("or-seq-on"), oe());
          };
          let X = !1;
          a.bake = () => {
            X || ((X = !0), A().catch(() => { }));
          };
          const we = l ? 0 : window.setTimeout(a.bake, 1500);
          T.push(() => clearTimeout(we));
          let me = 0;
          I(7, n(".or-rope-track"), p, 1, (B) => {
            ((W = Yt(B, 0.04, 0.62)),
              x ? ae() : u.set(W),
              Le(me, B, 0.7) && je(7, B >= 0.7 ? "light" : void 0));
            const se = Le(me, B, 0.74);
            ((se > 0 || (E && B >= 0.74)) &&
              y.fromTo(
                h,
                { yPercent: 80, opacity: 0 },
                {
                  yPercent: 0,
                  opacity: 1,
                  duration: 0.5,
                  stagger: 0.02,
                  ease: "power3.out",
                  overwrite: !0,
                },
              ),
              se < 0 && y.to(h, { opacity: 0, duration: 0.2, overwrite: !0 }),
              (me = B));
          });
          const $e = new ResizeObserver(() => {
            (u.resize(), x && oe());
          });
          ($e.observe(r), T.push(() => $e.disconnect()));
        }
        const Ye = f.map((i) => j("video", i)),
          Ge = new Set(),
          We = () => {
            (a.active >= 5 && a.bake(),
              Ye.forEach((i, r) =>
                i.forEach((s) => {
                  l &&
                    (r === a.active
                      ? s.play().catch(() => { })
                      : (s.pause(),
                        r === a.active + 1 &&
                        s.preload === "none" &&
                        (s.preload = "auto")));
                }),
              ));
          };
        if (!l) {
          const i = new IntersectionObserver(
            (r) =>
              r.forEach((s) => {
                const u = s.target;
                s.isIntersecting
                  ? (Ge.add(u), u.play().catch(() => { }))
                  : Ge.has(u) && u.pause();
              }),
            { rootMargin: "200px 0px" },
          );
          (Ye.flat().forEach((r) => i.observe(r)),
            T.push(() => i.disconnect()));
        }
        const Ve = () => (l ? a.active === 6 : !0),
          Te = (i, r) => {
            var w;
            const s = f[i],
              u = t.clientHeight,
              c = s.getBoundingClientRect().top,
              h = (x) => {
                const M = x.getBoundingClientRect();
                return M.bottom > c && M.top < c + u;
              },
              p = j("[data-rise]", s).filter(h),
              k = j("[data-spell] .or-l", s).filter(
                (x) => !x.closest(".or-idea, .or-q, .or-car-title") && h(x),
              );
            if (E) {
              y.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.35 });
              return;
            }
            (y.fromTo(
              p,
              { y: 50, rotate: 3, opacity: 0, transformOrigin: "0% 100%" },
              {
                y: 0,
                rotate: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.05,
                ease: "power3.out",
                delay: r,
                overwrite: "auto",
                clearProps: "transform",
              },
            ),
              y.fromTo(
                k,
                { yPercent: 70, opacity: 0 },
                {
                  yPercent: 0,
                  opacity: 1,
                  duration: 0.5,
                  stagger: 0.014,
                  ease: "power3.out",
                  delay: r + 0.05,
                  overwrite: "auto",
                },
              ),
              i === 4 && ((w = y.getById("rings")) == null || w.restart(!0)));
          },
          qe = (i, r) => {
            f.forEach((c, h) =>
              y.set(c, { yPercent: h < i ? -100 : h > i ? 100 : 0 }),
            );
            const s = f[i],
              u = s.scrollHeight - s.clientHeight;
            ((a.cur = a.target = a.written = r ? u : 0),
              (s.scrollTop = a.cur),
              (a.ln[i]?.resize(), a.ln[i]?.scrollTo(a.cur, { immediate: !0, force: !0 })),
              (a.lt[i] = a.cur),
              (a.push = 0),
              (a.active = i),
              t.setAttribute("data-scene", ge[i].id),
              U(),
              We(),
              ke.update());
          },
          lt = (i) => {
            const r = a.active,
              s = i > r ? 1 : -1,
              u = performance.now();
            ((a.busyUntil =
              u + (E ? 400 : _e + 120 + (Ut(ge[r].id, ge[i].id) ? 1300 : 0))),
              (a.changedAt = u),
              (a.stale = !0));
            const c = f[r],
              h = f[i],
              p = h.scrollHeight - h.clientHeight;
            if (
              ((a.cur = a.target = a.written = s > 0 ? 0 : p),
                (h.scrollTop = a.cur),
                (a.ln[i]?.resize(), a.ln[i]?.scrollTo(a.cur, { immediate: !0, force: !0 })),
                (a.lt[i] = a.cur),
                (a.push = 0),
                (a.active = i),
                t.setAttribute("data-scene", ge[i].id),
                E)
            ) {
              (qe(i, s < 0), Te(i, 0));
              return;
            }
            (y.set(h, { yPercent: 100 * s }),
              y.to(h, {
                yPercent: 0,
                duration: _e / 1e3,
                ease: "power2.inOut",
              }),
              y.to(c, {
                yPercent: -100 * s,
                duration: _e / 1e3,
                ease: "power2.inOut",
                onComplete: We,
              }),
              Ut(ge[r].id, ge[i].id) ? ct() : U(),
              We(),
              ke.update(),
              Te(i, Ut(ge[r].id, ge[i].id) ? 1.5 : 0.22));
          },
          ct = () => {
            const i = n(".or-flash");
            (U("dark"),
              y.fromTo(
                i,
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.7, ease: "power2.inOut", overwrite: !0 },
              ),
              j(".or-flash-row", i).forEach((r, s) =>
                y.fromTo(
                  r,
                  { xPercent: s % 2 ? -50 : 0 },
                  {
                    xPercent: s % 2 ? 0 : -50,
                    duration: [3, 1.5, 2.5, 1.8, 1.5, 2.2, 1.6][s],
                    ease: "none",
                    repeat: 1,
                  },
                ),
              ),
              y.delayedCall(1.7, () => {
                (y.to(i, { autoAlpha: 0, duration: 0.45, ease: "power2.out" }),
                  U());
              }));
          },
          Xe = (i) => {
            if (i === a.active || i < 0 || i >= re) return;
            if (!l) {
              f[i].scrollIntoView({ behavior: E ? "auto" : "smooth" });
              return;
            }
            if (E) {
              (qe(i, !1), Te(i, 0));
              return;
            }
            const r = performance.now();
            ((a.busyUntil = r + 1500), (a.changedAt = r + 1e3), (a.stale = !0));
            const s = n(".or-jump"),
              u = j(".or-jump-logo path, .or-jump-logo text", s);
            (s.setAttribute("data-c", Kt(Y(a.active))),
              y
                .timeline()
                .set(s, { autoAlpha: 1 })
                .fromTo(
                  n(".or-jump-disc", s),
                  { x: () => -2 * Math.max(V(), K()), opacity: 1 },
                  { x: 0, duration: 0.45, ease: "power3.out" },
                )
                .fromTo(
                  u,
                  { strokeDashoffset: 420 },
                  { strokeDashoffset: 0, duration: 0.5, ease: "power1.inOut" },
                  0.4,
                )
                .call(() => qe(i, !1), [], 0.6)
                .to(s, { autoAlpha: 0, duration: 0.4 }, 1)
                .call(() => Te(i, 0), [], 1));
          };
        if (((Z.current = { jump: Xe }), l)) {
          ((a.ln = f.map(
            (c) =>
              new Lenis({
                wrapper: c,
                content: c,
                autoRaf: !1,
                smoothWheel: !1,
                syncTouch: !1,
                virtualScroll: () => !1,
                lerp: 0.12,
              }),
          )),
            T.push(() => a.ln.forEach((c) => c.destroy())));
          {
            const c = new ResizeObserver(() => a.ln.forEach((h) => h.resize()));
            (f.forEach((h) => [...h.children].forEach((p) => c.observe(p))),
              T.push(() => c.disconnect()));
          }
          (qe(0, !1), Te(0, 0.15));
          let i = 0,
            r = performance.now();
          const s = (c) => {
            const h = c - r;
            r = c;
            const p = f[a.active],
              L = a.ln[a.active];
            ((a.lt[a.active] !== a.target ||
              (!L.isScrolling && Math.abs(L.animatedScroll - a.target) > 0.5)) &&
              ((a.lt[a.active] = a.target),
                L.scrollTo(a.target, { lerp: 0.12, force: !0 })),
              L.raf(c),
              p.scrollTop !== a.last && ((a.last = p.scrollTop), ke.update()),
              L.isScrolling
                ? ((a.mv = c),
                  a.sc || ((a.sc = !0), t.classList.add("or-scrolling")))
                : a.sc &&
                c - a.mv > 160 &&
                ((a.sc = !1), t.classList.remove("or-scrolling")),
              (a.cur = L.animatedScroll),
              (a.written = p.scrollTop),
              (i = requestAnimationFrame(s)));
          };
          ((i = requestAnimationFrame(s)),
            T.push(() => cancelAnimationFrame(i)),
            f.forEach((c, h) =>
              q(c, "scroll", () => {
                h === a.active &&
                  Math.abs(c.scrollTop - a.written) > 2 &&
                  (a.cur = a.target = a.written = c.scrollTop);
              }),
            ),
            q(t, "focusin", (c) => {
              const h = c.target.closest(".or-scene"),
                p = f.indexOf(h);
              (p >= 0 &&
                p !== a.active &&
                performance.now() > a.busyUntil &&
                qe(p, !1),
                (t.scrollTop = 0),
                (t.scrollLeft = 0));
            }),
            q(t, "scroll", () => {
              ((t.scrollTop = 0), (t.scrollLeft = 0));
            }));
          const u = (c) => {
            const h = _t(a.active, c, re);
            return h < 0 ? !1 : (lt(h), !0);
          };
          (q(
            t,
            "wheel",
            (c) => {
              if (c.ctrlKey || t.classList.contains("or-menu-open")) return;
              const h = performance.now(),
                p = h - a.lastWheel;
              a.lastWheel = h;
              const k = Ht(c.deltaY, c.deltaMode, t.clientHeight);
              if (!k) return;
              if (
                ((p > Ot || h - a.changedAt > 1400) && (a.stale = !1),
                  h < a.busyUntil || a.stale)
              )
                return c.preventDefault();
              const w = f[a.active],
                x = w.scrollHeight - w.clientHeight,
                M = Ft(a, k, a.cur, x, Bt, 2.6, t.clientHeight * 0.9);
              ((a.target = M.target),
                (a.push = M.push),
                !(M.turn && !u(M.turn)) && c.preventDefault());
            },
            { passive: !1 },
          ),
            q(window, "keydown", (c) => {
              const h = c.target;
              if (
                c.defaultPrevented ||
                c.altKey ||
                c.ctrlKey ||
                c.metaKey ||
                h.closest("input, textarea, select, [contenteditable]")
              )
                return;
              if (t.classList.contains("or-menu-open")) {
                c.key === "Escape" && fe(!1);
                return;
              }
              const p = Zt(c.key, c.shiftKey, re);
              if (
                !p ||
                (c.key === " " && h.closest("button, a, label")) ||
                (c.preventDefault(), performance.now() < a.busyUntil)
              )
                return;
              if (p.kind === "jump") return Xe(p.to);
              const k = f[a.active],
                w = k.scrollHeight - k.clientHeight,
                x = /Page| /.test(c.key) ? t.clientHeight * 0.85 : 140;
              (p.to > 0 ? a.cur >= w - 1.5 : a.cur <= 1.5)
                ? u(p.to)
                : (a.target = Math.min(w, Math.max(0, a.target + p.to * x)));
            }));
        } else
          (!E &&
            (() => {
              const i = new Lenis({ lerp: 0.1 }),
                r = (s) => i.raf(s * 1e3);
              (i.on("scroll", ke.update),
                y.ticker.add(r),
                y.ticker.lagSmoothing(0),
                T.push(() => {
                  (y.ticker.remove(r), i.destroy());
                }));
            })(),
            f.forEach((i, r) => {
            (ke.create({
              trigger: i,
              start: "top 10%",
              end: "bottom 10%",
              onToggle: (s) => {
                s.isActive && ((a.active = r), U());
              },
            }),
              j("[data-rise], [data-spell]", i)
                .filter((s) => !s.closest(".or-idea, .or-car-title"))
                .forEach((s) =>
                  E
                    ? y.from(s, {
                      opacity: 0,
                      duration: 0.5,
                      scrollTrigger: {
                        trigger: s,
                        start: "top 92%",
                        once: !0,
                      },
                    })
                    : y.from(s.matches("[data-spell]") ? j(".or-l", s) : s, {
                      y: s.matches("[data-spell]") ? 0 : 40,
                      yPercent: s.matches("[data-spell]") ? 70 : 0,
                      rotate: s.matches("[data-spell]") ? 0 : 3,
                      opacity: 0,
                      duration: 0.5,
                      stagger: 0.014,
                      ease: "power3.out",
                      scrollTrigger: {
                        trigger: s,
                        start: "top 92%",
                        once: !0,
                      },
                    }),
                ));
          }),
            U(),
            We());
        const Ze = n(".or-dot"),
          dt = n(".or-iris"),
          Be = n(".or-eye"),
          ht = n(".or-blob"),
          Ue = j("[data-mag]"),
          R = {
            x: -100,
            y: -100,
            bx: 0,
            by: 0,
            dx: -100,
            dy: -100,
            idle: 0,
            inside: !1,
          },
          Ke = Ue.map((i) => f.indexOf(i.closest(".or-scene")));
        let Oe = 0;
        (q(window, "pointermove", (i) => {
          var s, u;
          if (i.pointerType !== "mouse") return;
          ((R.x = i.clientX),
            (R.y = i.clientY),
            (R.idle = performance.now()),
            (R.inside = !0));
          const r =
            (u = (s = i.target).closest) == null
              ? void 0
              : u.call(s, "[data-cursor], a, button, label");
          (Ze.setAttribute(
            "data-k",
            r ? r.getAttribute("data-cursor") || "nav" : "",
          ),
            Be.classList.remove("is-asleep"),
            clearTimeout(Oe),
            (Oe = window.setTimeout(() => Be.classList.add("is-asleep"), 2e3)));
        }),
          T.push(() => clearTimeout(Oe)));
        let He = 0;
        const Qe = () => {
          const i = l,
            r =
              performance.now() - R.idle > 1500 &&
              Math.abs(R.x - R.dx) < 0.5 &&
              Math.abs(R.y - R.dy) < 0.5 &&
              (!Ve() || (R.bx === R.x && R.by === R.y));
          if (i && !r) {
            const s = Ue.filter((p, k) => Ke[k] < 0 || Ke[k] === a.active),
              u = s.map((p) => p.getBoundingClientRect()),
              c = a.active === 0 ? Be.getBoundingClientRect() : { width: 0 },
              h = t.getBoundingClientRect();
            if (
              ((R.dx += (R.x - R.dx) * 0.18),
                (R.dy += (R.y - R.dy) * 0.18),
                (Ze.style.transform =
                  "translate3d(" +
                  (R.dx - h.left) +
                  "px," +
                  (R.dy - h.top) +
                  "px,0)"),
                s.forEach((p, k) => {
                  const w = u[k],
                    x = w.left + w.width / 2,
                    M = w.top + w.height / 2,
                    H = Math.max(w.width, w.height) * 0.9 + 30,
                    Q = R.x - x,
                    W = R.y - M,
                    ae = Math.abs(Q) < H && Math.abs(W) < H,
                    oe = p._m ?? [0, 0],
                    L = ae ? Q * 0.28 : 0,
                    A = ae ? W * 0.28 : 0;
                  ((oe[0] += (L - oe[0]) * 0.12),
                    (oe[1] += (A - oe[1]) * 0.12),
                    (p._m = oe),
                    (p.style.translate =
                      oe[0].toFixed(2) + "px " + oe[1].toFixed(2) + "px"));
                }),
                c.width)
            ) {
              const p = R.x - (c.left + c.width / 2),
                k = R.y - (c.top + c.height / 2),
                w = Math.hypot(p, k) || 1,
                x = Math.min(1, w / 300) * 8;
              dt.setAttribute(
                "transform",
                "translate(" +
                ((p / w) * x).toFixed(2) +
                " " +
                ((k / w) * x * 0.6).toFixed(2) +
                ")",
              );
            }
            Ve() &&
              ((R.bx += (R.x - R.bx) * 0.04),
                (R.by += (R.y - R.by) * 0.04),
                Math.abs(R.x - R.bx) < 0.3 &&
                Math.abs(R.y - R.by) < 0.3 &&
                ((R.bx = R.x), (R.by = R.y)),
                (ht.style.transform =
                  "translate3d(" +
                  (R.bx - h.left) +
                  "px," +
                  (R.by - h.top) +
                  "px,0)"));
          }
          He = requestAnimationFrame(Qe);
        };
        (l && (He = requestAnimationFrame(Qe)),
          T.push(() => cancelAnimationFrame(He)));
        {
          const i = n(".or-bubbles"),
            r = i.getContext("2d"),
            s = ["#7c8cff", "#f2c86b", "#c39ad6", "#7fd3b4"],
            u = l ? 30 : 10;
          let c = [];
          const h = () => {
            const H = Math.min(2, window.devicePixelRatio);
            ((i.width = i.clientWidth * H),
              (i.height = i.clientHeight * H),
              r.setTransform(H, 0, 0, H, 0, 0));
            const Q = i.clientWidth,
              W = i.clientHeight;
            c = Array.from({ length: u }, (ae, oe) => ({
              x: Math.random() * Q,
              y: W * (0.2 + Math.random()),
              r: 2.5 + Math.random() * 3.5,
              v: 0.4 + Math.random() * 1.2,
              c: s[oe % s.length],
            }));
          };
          let p = 0,
            k = !l;
          const w = new IntersectionObserver((H) => (k = H[0].isIntersecting));
          l || w.observe(i);
          const x = () => {
            if (
              ((p = requestAnimationFrame(x)), E || (l ? a.active !== 6 : !k))
            )
              return;
            const H = i.clientWidth,
              Q = i.clientHeight;
            r.clearRect(0, 0, H, Q);
            for (const W of c)
              ((W.y -= W.v),
                W.y + W.r < 0 && (W.y = Q + 40),
                r.beginPath(),
                r.arc(W.x, W.y, W.r, 0, Math.PI * 2),
                (r.fillStyle = W.c),
                r.fill());
          };
          (h(), (p = requestAnimationFrame(x)));
          const M = new ResizeObserver(h);
          (M.observe(i),
            T.push(
              () => (cancelAnimationFrame(p), M.disconnect(), w.disconnect()),
            ));
        }
        ke.refresh();
      }, t);
      return () => {
        ((Z.current = null),
          T.forEach((C) => C()),
          Ie.revert(),
          t.classList.remove("or-live"));
      };
    }, [le, E, ie]),
    F.useEffect(() => {
      var t;
      (t = N.current) == null || t.classList.toggle("or-menu-open", ee);
    }, [ee]));
  const te = (t) => (l) => {
    var n, j;
    (l.preventDefault(),
      ee
        ? ((n = Z.current) == null || n.jump(t),
          window.setTimeout(() => fe(!1), le === "deck" ? 500 : 0))
        : (j = Z.current) == null || j.jump(t));
  },
    Se = [
      {
        label: "About us",
        to: 1,
        panel: e.jsx("span", { style: { background: "#282643" } }),
      },
      {
        label: "What we make",
        to: 2,
        panel: e.jsx("img", { src: J(29008324, 900), alt: "" }),
      },
      {
        label: "Our work",
        to: 5,
        panel: e.jsx("img", {
          src: m[0].img.replace(/w=\d+/, "w=900"),
          alt: "",
        }),
      },
      {
        label: "Contact",
        to: 8,
        panel: e.jsx("span", { style: { background: "#c9ece4" } }),
      },
    ];
  return e.jsxs("div", {
    ref: N,
    className: $(
      "or-root",
      le === "stack" && "or-stack",
      E && "or-reduced",
      ie && "or-dark",
      D,
    ),
    style: { "--h": O },
    "data-scene": "home",
    children: [
      P && e.jsx("link", { rel: "stylesheet", href: P }),
      e.jsx("style", { children: ro }),
      e.jsx("div", { className: "or-probe", "aria-hidden": "true" }),
      e.jsxs("header", {
        className: "or-header",
        "data-tone": "light",
        children: [
          e.jsx("nav", {
            className: $("or-rail", ee && "is-hidden"),
            "aria-label": "Scene index",
            children: ge.map((t, l) =>
              e.jsxs(
                "button",
                {
                  type: "button",
                  className: $(l === 0 && "is-on"),
                  "aria-label": "Go to " + t.label,
                  "data-cursor": "menu",
                  onClick: () => {
                    var n;
                    return (n = Z.current) == null ? void 0 : n.jump(l);
                  },
                  children: [
                    e.jsx("i", {}),
                    e.jsx("span", {
                      children: String(l + 1).padStart(2, "0") + " " + t.label,
                    }),
                  ],
                },
                t.id,
              ),
            ),
          }),
          e.jsxs("a", {
            href: "#home",
            className: "or-logo or-rl",
            "data-cursor": "nav",
            onClick: te(0),
            "aria-label": o + " home",
            children: [
              e.jsx(Pe, { className: "or-logo-m" }),
              e.jsx("span", { children: o.toLowerCase() }),
            ],
          }),
          e.jsx("nav", {
            className: "or-nav",
            "aria-label": "Scenes",
            children: [
              ["Home", 0],
              ["About", 1],
              ["Work", 5],
              ["Contact", 8],
            ].map(([t, l]) =>
              e.jsx(
                "a",
                {
                  href: "#" + ge[l].id,
                  className: "or-rl",
                  "data-cursor": "nav",
                  onClick: te(l),
                  children: e.jsx(pe, { children: t }),
                },
                t,
              ),
            ),
          }),
          e.jsxs("div", {
            className: "or-head-r",
            children: [
              e.jsxs("a", {
                href: "/dashboard",
                className: "or-talk or-rl",
                "data-cursor": "nav",
                children: [
                  e.jsx("i", {}),
                  e.jsx(pe, { children: "Dashboard" }),
                ],
              }),
              e.jsxs("button", {
                type: "button",
                className: $("or-burger", ee && "is-open"),
                "data-mag": "",
                "data-cursor": "menu",
                "aria-expanded": ee,
                "aria-controls": "or-menu",
                onClick: () => fe((t) => !t),
                children: [
                  e.jsxs("span", {
                    className: "or-burger-t",
                    children: [
                      e.jsx("span", { children: "menu" }),
                      e.jsx("span", { children: "close" }),
                    ],
                  }),
                  e.jsxs("span", {
                    className: "or-burger-l",
                    "aria-hidden": "true",
                    children: [e.jsx("i", {}), e.jsx("i", {})],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      e.jsxs("section", {
        className: "or-scene or-s-home",
        id: "home",
        "aria-label": "Home",
        children: [
          e.jsxs("div", {
            className: "or-home",
            children: [
              e.jsx("h1", {
                className: "or-hero",
                children: e.jsx(ne, { text: d }),
              }),
              e.jsxs("div", {
                className: "or-home-meta",
                "data-rise": "",
                children: [
                  e.jsxs("span", {
                    className: "or-rate",
                    children: [
                      e.jsx(Pe, { className: "or-rate-m" }),
                      e.jsxs("span", {
                        children: [
                          e.jsx(st, {}),
                          e.jsx("small", {
                            children: "4.9 from 38 client reviews",
                          }),
                        ],
                      }),
                    ],
                  }),
                  e.jsx("p", {
                    className: "or-services",
                    children:
                      "Brand systems / Product design / Websites / Motion / 3D / Design systems",
                  }),
                  e.jsx("a", {
                    className: "or-deck-pill or-rl",
                    href: "#work",
                    "data-mag": "",
                    "data-cursor": "nav",
                    onClick: te(5),
                    children: e.jsx(pe, { children: "Studio deck" }),
                  }),
                ],
              }),
              e.jsx("div", {
                className: "or-eye-wrap",
                children: e.jsx(Qt, {}),
              }),
            ],
          }),
          e.jsx("div", {
            className: "or-reel-track",
            children: e.jsx("div", {
              className: "or-reel",
              children: e.jsxs("div", {
                className: "or-reel-mask",
                children: [
                  e.jsx("div", {
                    className: "or-reel-in",
                    children: e.jsx(Ce, { src: Pt }),
                  }),
                  e.jsx("span", {
                    className: "or-reel-cap",
                    children: "Showreel 2026 — 01:12",
                  }),
                  e.jsx("button", {
                    type: "button",
                    className: "or-play",
                    "data-mag": "",
                    "data-cursor": "button",
                    "aria-label": "Pause or play the showreel",
                    onClick: (t) => {
                      const l =
                        t.currentTarget.parentElement.querySelector("video");
                      (l.paused ? l.play() : l.pause(),
                        t.currentTarget.classList.toggle(
                          "is-paused",
                          l.paused,
                        ));
                    },
                    children: e.jsx("i", {}),
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
      e.jsx("section", {
        className: "or-scene or-s-about",
        id: "about",
        "aria-label": "About",
        children: e.jsx("div", {
          className: "or-track or-about-track",
          children: e.jsx("div", {
            className: "or-stage",
            children: e.jsxs("div", {
              className: "or-about-row",
              children: [
                e.jsx("h2", {
                  className: "or-about-h",
                  children: e.jsx(ne, { text: "What is " + o + "?" }),
                }),
                At.map((t, l) =>
                  e.jsxs(
                    "article",
                    {
                      className: "or-card",
                      style: { background: t.tint },
                      "data-rise": "",
                      children: [
                        e.jsxs("svg", {
                          className: "or-card-rings",
                          viewBox: "0 0 600 600",
                          "aria-hidden": "true",
                          children: [
                            e.jsx("circle", { cx: "160", cy: "180", r: "290" }),
                            e.jsx("circle", { cx: "430", cy: "110", r: "290" }),
                          ],
                        }),
                        e.jsx("div", {
                          className: "or-card-pill",
                          children: e.jsx(Ce, { src: t.clip }),
                        }),
                        e.jsx("h3", { children: t.title }),
                        e.jsx("p", { children: t.text }),
                        e.jsxs("span", {
                          className: "or-num",
                          "aria-hidden": "true",
                          children: ["0", l + 1],
                        }),
                      ],
                    },
                    t.title,
                  ),
                ),
              ],
            }),
          }),
        }),
      }),
      e.jsx("section", {
        className: "or-scene or-s-make",
        id: "make",
        "aria-label": "What we make",
        children: e.jsx("div", {
          className: "or-track or-make-track",
          children: e.jsxs("div", {
            className: "or-stage or-make",
            children: [
              e.jsx("div", {
                className: "or-make-light",
                "aria-hidden": "true",
                children: e.jsx("span", { className: "or-grid" }),
              }),
              e.jsx("h2", {
                className: "or-make-word",
                children: e.jsx(ne, { text: "We make" }),
              }),
              e.jsxs("div", {
                className: "or-mock",
                "aria-hidden": "true",
                children: [
                  e.jsxs("div", {
                    className: "or-mock-in",
                    children: [
                      e.jsxs("div", {
                        className: "or-m-top",
                        children: [
                          e.jsx(Pe, { className: "or-m-logo" }),
                          e.jsx("span", {
                            className: "or-m-tab is-on",
                            children: "Projects",
                          }),
                          e.jsx("span", {
                            className: "or-m-tab",
                            children: "Planning",
                          }),
                          e.jsx("span", {
                            className: "or-m-tab",
                            children: "Calendar",
                          }),
                          e.jsx("span", {
                            className: "or-m-search",
                            children: "Search tasks",
                          }),
                          e.jsx("span", {
                            className: "or-m-faces",
                            children: rt
                              .slice(0, 4)
                              .map((t) =>
                                e.jsx("img", { src: J(t, 80, 80), alt: "" }, t),
                              ),
                          }),
                          e.jsx("span", {
                            className: "or-m-new",
                            children: "+ New task",
                          }),
                        ],
                      }),
                      e.jsx("div", {
                        className: "or-m-side",
                        children: [0, 1, 2, 3, 4].map((t) =>
                          e.jsx("i", { className: $(t === 1 && "is-on") }, t),
                        ),
                      }),
                      e.jsx("div", {
                        className: "or-m-stats",
                        children: [
                          ["In review", "12", "#7c8cff"],
                          ["Shipped this month", "48", "#3fbf8f"],
                          ["Team focus", "86%", "#f2b84b"],
                        ].map(([t, l, n]) =>
                          e.jsxs(
                            "div",
                            {
                              className: "or-m-stat",
                              children: [
                                e.jsx("small", { children: t }),
                                e.jsx("b", { children: l }),
                                e.jsx("span", { style: { background: n } }),
                              ],
                            },
                            t,
                          ),
                        ),
                      }),
                      e.jsxs("div", {
                        className: "or-m-title",
                        children: [
                          e.jsx("small", {
                            children: "Tidepool / Spring launch",
                          }),
                          e.jsx("b", { children: "Today" }),
                        ],
                      }),
                      [
                        [
                          "Backlog",
                          "#9a9aa3",
                          ["Onboarding copy", "Empty states", "Icon audit"],
                        ],
                        ["In progress", "#7c8cff", []],
                        ["Done", "#3fbf8f", ["Color tokens", "Pricing page"]],
                      ].map(([t, l, n], j) =>
                        e.jsxs(
                          "div",
                          {
                            className: "or-m-col or-m-col" + j,
                            children: [
                              e.jsxs("div", {
                                className: "or-m-colh",
                                children: [
                                  e.jsx("i", { style: { background: l } }),
                                  t,
                                ],
                              }),
                              j === 1
                                ? e.jsxs("div", {
                                  className: "or-m-card or-m-card-big",
                                  children: [
                                    e.jsx("b", { children: "Launch film" }),
                                    e.jsx("small", {
                                      children: "Motion · 3D · due Friday",
                                    }),
                                    e.jsx("div", {
                                      className: "or-slot",
                                      children: e.jsx(Ce, { src: ot }),
                                    }),
                                  ],
                                })
                                : n.map((f, z) =>
                                  e.jsxs(
                                    "div",
                                    {
                                      className: "or-m-card",
                                      children: [
                                        e.jsx("b", { children: f }),
                                        e.jsxs("small", {
                                          children: [
                                            ["Brand", "Product", "Web"][
                                            z % 3
                                            ],
                                            " · ",
                                            z + 2,
                                            " comments",
                                          ],
                                        }),
                                        e.jsx("span", {
                                          className: "or-m-bar",
                                          children: e.jsx("span", {
                                            style: {
                                              width: 30 + z * 25 + "%",
                                              background: l,
                                            },
                                          }),
                                        }),
                                      ],
                                    },
                                    f,
                                  ),
                                ),
                            ],
                          },
                          t,
                        ),
                      ),
                    ],
                  }),
                  e.jsxs("div", {
                    className: "or-skel",
                    children: [
                      e.jsx("i", {
                        style: {
                          left: "5.5%",
                          top: "4%",
                          width: "30%",
                          height: "6%",
                        },
                      }),
                      e.jsx("i", {
                        style: {
                          left: "70%",
                          top: "4%",
                          width: "24%",
                          height: "6%",
                        },
                      }),
                      [0, 1, 2].map((t) =>
                        e.jsx(
                          "i",
                          {
                            style: {
                              left: 8.3 + t * 30.3 + "%",
                              top: "15%",
                              width: "28%",
                              height: "15%",
                            },
                          },
                          "s" + t,
                        ),
                      ),
                      e.jsx("i", {
                        style: {
                          left: "8.3%",
                          top: "35%",
                          width: "22%",
                          height: "6%",
                        },
                      }),
                      [8.3, 34.1, 67.4].map((t, l) =>
                        e.jsx(
                          "i",
                          {
                            style: {
                              left: t + "%",
                              top: "47%",
                              width: l === 1 ? "31.8%" : "24%",
                              height: "48%",
                            },
                          },
                          "c" + l,
                        ),
                      ),
                    ],
                  }),
                  e.jsx("span", { className: "or-notch" }),
                ],
              }),
              e.jsx("div", {
                className: "or-make-media",
                "aria-hidden": "true",
                children: e.jsx(Ce, { src: ot }),
              }),
              at.map((t) =>
                e.jsxs(
                  "span",
                  {
                    className: "or-cur",
                    style: { "--c": t.c },
                    "aria-hidden": "true",
                    children: [
                      e.jsx("svg", {
                        viewBox: "0 0 16 18",
                        children: e.jsx("path", {
                          d: "M1 1l13 6.5-5.6 1.6L5.8 16Z",
                        }),
                      }),
                      e.jsx("b", { children: t.name }),
                    ],
                  },
                  t.name,
                ),
              ),
              e.jsx("div", {
                className: "or-tag",
                "aria-live": "polite",
                children: It.map((t) =>
                  e.jsx("span", { className: "or-tag-l", children: t }, t),
                ),
              }),
            ],
          }),
        }),
      }),
      e.jsx("section", {
        className: "or-scene or-s-people",
        id: "people",
        "aria-label": "People",
        children: e.jsx("div", {
          className: "or-track or-people-track",
          children: e.jsxs("div", {
            className: "or-stage or-people",
            children: [
              [J(29008324, 700), J(12932574, 700), J(4464884, 700)].map(
                (t, l) =>
                  e.jsx(
                    "img",
                    {
                      className: "or-fly or-fly" + l,
                      src: t,
                      alt: "",
                      "aria-hidden": "true",
                    },
                    t,
                  ),
              ),
              e.jsxs("h2", {
                className: "or-people-h",
                children: [
                  e.jsx("span", {
                    className: "or-sr",
                    children:
                      "Every designer here was chosen from several hundred others.",
                  }),
                  e.jsx("span", {
                    className: "or-pl",
                    "aria-hidden": "true",
                    children: e.jsx(ne, {
                      text: "Every designer here",
                      hidden: !0,
                    }),
                  }),
                  e.jsx("span", {
                    className: "or-pl or-hi",
                    "aria-hidden": "true",
                    children: e.jsx(ne, {
                      text: "was chosen from",
                      hidden: !0,
                    }),
                  }),
                  e.jsxs("span", {
                    className: "or-pl",
                    "aria-hidden": "true",
                    children: [
                      e.jsx(ne, { text: "several", hidden: !0 }),
                      e.jsxs("span", {
                        className: "or-gap",
                        children: [
                          e.jsxs("span", {
                            className: "or-ava",
                            children: [
                              rt.map((t) =>
                                e.jsx(
                                  "img",
                                  { src: J(t, 120, 120), alt: "" },
                                  t,
                                ),
                              ),
                              e.jsx("b", { children: "+40" }),
                            ],
                          }),
                          e.jsx("span", {
                            className: "or-gap-word",
                            children: "hundred",
                          }),
                        ],
                      }),
                      e.jsx(ne, { text: "others", hidden: !0 }),
                    ],
                  }),
                ],
              }),
              e.jsx("span", { className: "or-swallow", "aria-hidden": "true" }),
            ],
          }),
        }),
      }),
      e.jsx("section", {
        className: "or-scene or-s-quote",
        id: "quote",
        "aria-label": "What we believe",
        children: e.jsx("div", {
          className: "or-track or-quote-track",
          children: e.jsxs("div", {
            className: "or-stage or-quote",
            children: [
              e.jsx("span", {
                className: "or-ring-c or-ring-c0",
                "aria-hidden": "true",
              }),
              e.jsx("span", {
                className: "or-ring-c or-ring-c1",
                "aria-hidden": "true",
              }),
              e.jsx("span", {
                className: "or-ring-c or-ring-c2",
                "aria-hidden": "true",
              }),
              e.jsx("span", {
                className: "or-qmark",
                "aria-hidden": "true",
                "data-rise": "",
                children: "“",
              }),
              e.jsx("blockquote", {
                className: "or-q",
                children: e.jsx(ne, {
                  text: "Anyone can draw a square. Very few can make it feel like a place you want to stay.",
                }),
              }),
              e.jsx("span", {
                className: "or-qbar",
                "aria-hidden": "true",
                children: e.jsx("i", {}),
              }),
              e.jsx("p", {
                className: "or-qcap",
                "data-rise": "",
                children:
                  "Ines Varga, founder. Every brief starts with this sentence pinned above the table.",
              }),
            ],
          }),
        }),
      }),
      e.jsx("section", {
        className: "or-scene or-s-work",
        id: "work",
        "aria-label": "Selected work",
        children: e.jsx("div", {
          className: "or-track or-work-track",
          children: e.jsxs("div", {
            className: "or-stage or-work",
            children: [
              e.jsxs("div", {
                className: "or-work-lift",
                children: [
                  e.jsx("p", {
                    className: "or-work-k",
                    "data-rise": "",
                    children: "Selected work, 2024 – 2026",
                  }),
                  e.jsx("div", {
                    "data-rise": "",
                    className: "or-car-wrap",
                    children: e.jsx($t, { projects: m }),
                  }),
                ],
              }),
              e.jsx("div", {
                className: "or-hand",
                "aria-hidden": "true",
                children: e.jsx(Ce, { src: Me(15863511, "sd_960_540") }),
              }),
              e.jsx("svg", {
                className: "or-thread",
                viewBox: "0 0 1440 900",
                preserveAspectRatio: "none",
                "aria-hidden": "true",
                children: e.jsx("path", {
                  pathLength: 1,
                  d: "M1272 748C1262 520 1060 410 900 330C780 270 722 170 720 -10",
                }),
              }),
              e.jsx("span", { className: "or-slit", "aria-hidden": "true" }),
            ],
          }),
        }),
      }),
      e.jsx("section", {
        className: "or-scene or-s-proof",
        id: "proof",
        "aria-label": "Who we work with",
        children: e.jsx("div", {
          className: "or-track or-proof-track",
          children: e.jsxs("div", {
            className: "or-stage or-proof",
            children: [
              e.jsx("canvas", {
                className: "or-bubbles",
                "aria-hidden": "true",
              }),
              e.jsx("span", { className: "or-blob", "aria-hidden": "true" }),
              e.jsx("div", {
                className: "or-cube-wrap",
                children: e.jsxs("div", {
                  className: "or-cube",
                  children: [
                    e.jsxs("div", {
                      className: "or-face or-face-a",
                      children: [
                        e.jsx("span", {
                          className: "or-sr",
                          children: "We're trusted by 140 teams",
                        }),
                        Array.from({ length: 13 }, (t, l) =>
                          e.jsxs(
                            "span",
                            {
                              "aria-hidden": "true",
                              className: $(l === 0 && "is-hi"),
                              children: [
                                "We're trusted by ",
                                e.jsx("em", { children: "140 teams" }),
                              ],
                            },
                            l,
                          ),
                        ),
                      ],
                    }),
                    e.jsx("ul", {
                      className: "or-face or-face-b",
                      children: Wt.map((t) =>
                        e.jsx(
                          "li",
                          {
                            children: e.jsx("a", {
                              href: "#work",
                              className: "or-rl",
                              "data-cursor": "nav",
                              onClick: te(5),
                              children: e.jsx(pe, { children: t }),
                            }),
                          },
                          t,
                        ),
                      ),
                    }),
                  ],
                }),
              }),
            ],
          }),
        }),
      }),
      e.jsx("section", {
        className: "or-scene or-s-rope",
        id: "process",
        "aria-label": "How we work",
        children: e.jsx("div", {
          className: "or-track or-rope-track",
          children: e.jsxs("div", {
            className: "or-stage or-rope",
            children: [
              e.jsx("span", {
                className: "or-rope-fill",
                "aria-hidden": "true",
              }),
              e.jsx("svg", {
                className: "or-rope-bg",
                viewBox: "0 0 1440 900",
                preserveAspectRatio: "none",
                "aria-hidden": "true",
                children: e.jsx("path", {
                  pathLength: 1,
                  d: "M1460 470C1180 560 860 600 640 640C430 680 330 820 230 800C110 776 120 640 300 620C520 596 560 760 470 900",
                }),
              }),
              e.jsx("p", {
                className: "or-rope-line",
                "data-rise": "",
                children:
                  "Our studio is a calm room where knotty problems come undone.",
              }),
              e.jsxs("div", {
                className: "or-squircle",
                children: [
                  e.jsx("canvas", {
                    className: "or-rope-c",
                    "aria-hidden": "true",
                  }),
                  e.jsx("canvas", {
                    className: "or-rope-seq",
                    "aria-hidden": "true",
                  }),
                  e.jsxs("h2", {
                    className: "or-idea",
                    children: [
                      e.jsx("span", {
                        className: "or-sr",
                        children: "Have a knotty idea?",
                      }),
                      e.jsx("span", {
                        className: "or-idea-l",
                        children: e.jsx(ne, { text: "Have a", hidden: !0 }),
                      }),
                      e.jsx("span", {
                        className: "or-idea-l",
                        children: e.jsx(ne, {
                          text: "knotty idea?",
                          hidden: !0,
                        }),
                      }),
                    ],
                  }),
                  e.jsx("div", {
                    className: "or-marq",
                    "aria-label": "Clients",
                    children: e.jsx("div", {
                      children: [...Fe, ...Fe].map((t, l) =>
                        e.jsx(
                          "span",
                          { "aria-hidden": l >= Fe.length, children: t },
                          l,
                        ),
                      ),
                    }),
                  }),
                ],
              }),
            ],
          }),
        }),
      }),
      e.jsxs("section", {
        className: "or-scene or-s-contact",
        id: "contact",
        "aria-label": "Contact",
        children: [
          e.jsxs("div", {
            className: "or-contact",
            children: [
              e.jsxs("div", {
                className: "or-contact-l",
                children: [
                  e.jsxs("h2", {
                    className: "or-contact-h",
                    "data-rise": "",
                    children: [
                      "Have a ",
                      e.jsx("img", {
                        src: J(29852852, 120, 120),
                        alt: "",
                        className: "or-contact-face",
                      }),
                      " knotty idea?",
                      e.jsx("br", {}),
                      "Tell us about it.",
                    ],
                  }),
                  e.jsxs("div", {
                    className: "or-trust",
                    "data-rise": "",
                    children: [
                      e.jsx("small", { children: "Clients trust us" }),
                      e.jsxs("span", {
                        className: "or-rate",
                        children: [
                          e.jsx(Pe, { className: "or-rate-m" }),
                          e.jsxs("span", {
                            children: [
                              e.jsx(st, {}),
                              e.jsx("small", {
                                children: "4.9 from 38 client reviews",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  e.jsxs("div", {
                    className: "or-follow",
                    "data-rise": "",
                    children: [
                      e.jsx("small", { children: "Follow us" }),
                      e.jsx("span", {
                        children: [
                          "Instagram",
                          "Dribbble",
                          "LinkedIn",
                          "Read.cv",
                        ].map((t) =>
                          e.jsx(
                            "a",
                            {
                              href: "#contact",
                              className: "or-social",
                              "data-cursor": "nav",
                              "aria-label": t,
                              children: t.slice(0, 2),
                            },
                            t,
                          ),
                        ),
                      }),
                    ],
                  }),
                  e.jsx("button", {
                    type: "button",
                    className: "or-sheet-open",
                    "data-rise": "",
                    onClick: () => ze(!0),
                    children: "Start a brief",
                  }),
                ],
              }),
              e.jsx("div", {
                className: $("or-sheet", de && "is-open"),
                children: e.jsx(Jt, {
                  email: b,
                  onClose: le === "stack" ? () => ze(!1) : void 0,
                }),
              }),
            ],
          }),
          e.jsxs("footer", {
            className: "or-foot",
            children: [
              e.jsxs("div", {
                className: "or-foot-big",
                "aria-hidden": "true",
                children: [
                  e.jsx(Pe, { className: "or-foot-m" }),
                  o.toLowerCase(),
                ],
              }),
              e.jsxs("div", {
                className: "or-foot-row",
                children: [
                  e.jsxs("address", {
                    children: [
                      o,
                      " Studio",
                      e.jsx("br", {}),
                      "Rua das Flores 14, Porto",
                    ],
                  }),
                  e.jsx("a", {
                    className: "or-under",
                    href: "mailto:" + b,
                    "data-cursor": "nav",
                    children: b,
                  }),
                  e.jsx("a", {
                    className: "or-deck-pill or-rl",
                    href: "#work",
                    "data-cursor": "nav",
                    onClick: te(5),
                    children: e.jsx(pe, { children: "Studio deck" }),
                  }),
                  e.jsxs("small", {
                    children: ["© 2026 ", o, " Studio · Privacy"],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      e.jsx("div", {
        className: "or-flash",
        "aria-hidden": "true",
        children: e.jsx("div", {
          className: "or-flash-in",
          children: Array.from({ length: 7 }, (t, l) =>
            e.jsx(
              "div",
              { className: "or-flash-row", children: "WE MAKE ".repeat(10) },
              l,
            ),
          ),
        }),
      }),
      e.jsxs("div", {
        className: "or-jump",
        "aria-hidden": "true",
        children: [
          e.jsx("span", { className: "or-jump-disc" }),
          e.jsxs("svg", {
            className: "or-jump-logo",
            viewBox: "0 0 300 90",
            children: [
              e.jsx("path", {
                d: "M14 82V42a28 28 0 0 1 56 0v40Z",
                pathLength: 420,
              }),
              e.jsx("path", { d: "M42 18v64M14 50h56", pathLength: 420 }),
              e.jsx("text", {
                x: "86",
                y: "78",
                pathLength: 420,
                children: o.toLowerCase(),
              }),
            ],
          }),
        ],
      }),
      e.jsxs("div", {
        id: "or-menu",
        className: $("or-menu", ee && "is-open"),
        role: "dialog",
        "aria-modal": "false",
        "aria-label": "Menu",
        "aria-hidden": !ee,
        children: [
          e.jsxs("div", {
            className: "or-menu-social",
            children: [
              e.jsx("small", { children: "Social" }),
              ["Instagram", "Dribbble", "Behance", "LinkedIn", "Read.cv"].map(
                (t) =>
                  e.jsx(
                    "a",
                    {
                      href: "#contact",
                      className: "or-rl",
                      "data-cursor": "nav",
                      tabIndex: ee ? 0 : -1,
                      children: e.jsx(pe, { children: t }),
                    },
                    t,
                  ),
              ),
              e.jsx("small", {
                className: "or-menu-mail",
                children: "Get in touch",
              }),
              e.jsx("a", {
                href: "mailto:" + b,
                className: "or-under",
                tabIndex: ee ? 0 : -1,
                children: b,
              }),
            ],
          }),
          e.jsx("div", {
            className: "or-menu-prev",
            "aria-hidden": "true",
            children: Se.map((t, l) =>
              e.jsx(
                "span",
                {
                  className: $("or-menu-p", Ae === l && "is-on"),
                  children: t.panel,
                },
                t.label,
              ),
            ),
          }),
          e.jsxs("nav", {
            className: "or-menu-links",
            "aria-label": "Menu",
            children: [
              e.jsx("small", { children: "Menu" }),
              Se.map((t, l) =>
                e.jsx(
                  "a",
                  {
                    href: "#" + ge[t.to].id,
                    className: "or-rl",
                    "data-cursor": "nav",
                    tabIndex: ee ? 0 : -1,
                    onMouseEnter: () => Re(l),
                    onFocus: () => Re(l),
                    onClick: te(t.to),
                    children: e.jsx(pe, { children: t.label }),
                  },
                  t.label,
                ),
              ),
            ],
          }),
        ],
      }),
      e.jsxs("div", {
        className: "or-float",
        children: [
          e.jsx("a", {
            href: "mailto:" + b,
            className: "or-metal or-metal-o",
            "data-cursor": "nav",
            "aria-label": "Email " + b,
            children: e.jsx("svg", {
              viewBox: "0 0 24 24",
              "aria-hidden": "true",
              children: e.jsx("path", { d: "M3 6h18v12H3z M3 7l9 6 9-6" }),
            }),
          }),
          e.jsx("a", {
            href: "#contact",
            className: "or-metal or-metal-o",
            "data-cursor": "nav",
            "aria-label": "Chat with the studio",
            onClick: te(8),
            children: e.jsx("svg", {
              viewBox: "0 0 24 24",
              "aria-hidden": "true",
              children: e.jsx("path", { d: "M4 5h16v11H9l-5 4z" }),
            }),
          }),
          e.jsxs("a", {
            href: "#contact",
            className: "or-metal or-metal-p",
            "data-cursor": "nav",
            onClick: te(8),
            children: [
              e.jsx("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true",
                children: e.jsx("path", {
                  d: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
                }),
              }),
              "Book a call",
            ],
          }),
        ],
      }),
      e.jsx("span", { className: "or-dot", "aria-hidden": "true" }),
    ],
  });
}
function to(o, d) {
  const m = new pt({ canvas: o, antialias: !0, alpha: !0 });
  (m.setPixelRatio(d), (m.toneMapping = ft), (m.outputColorSpace = mt));
  const b = new ut(),
    O = new gt(m),
    S = O.fromScene(new Tt(), 0.04).texture;
  b.environment = S;
  const P = new bt(28, 1, 0.1, 100);
  (P.position.set(0, 0.4, 15), P.lookAt(0, 0, 0));
  const g = new et(16773862, 2.2);
  (g.position.set(-4, 6, 8),
    (m.shadowMap.enabled = !0),
    (m.shadowMap.type = xt),
    (g.castShadow = !0),
    g.shadow.mapSize.set(d > 1 ? 2048 : 1024, d > 1 ? 2048 : 1024),
    Object.assign(g.shadow.camera, {
      left: -12,
      right: 12,
      top: 5,
      bottom: -5,
      near: 1,
      far: 30,
    }),
    (g.shadow.radius = 6),
    (g.shadow.bias = -5e-4),
    b.add(g));
  const D = new tt(new Rt(60, 20), new wt({ color: 2760540, opacity: 0.16 }));
  ((D.position.z = -0.75), (D.receiveShadow = !0), b.add(D));
  const N = new et(13157119, 1.6);
  (N.position.set(6, -2, -4), b.add(N));
  const Z = document.createElement("canvas");
  ((Z.width = 128), (Z.height = 64));
  const le = Z.getContext("2d"),
    be = le.createImageData(128, 64);
  for (let f = 0; f < 64; f++)
    for (let z = 0; z < 128; z++) {
      const v = ((z + f * 2) / 32) * Math.PI * 2,
        _ = Math.sin(((z * 3 - f) / 9) * Math.PI) * 0.18,
        re = Math.cos(v) * 0.55 + _,
        T = Math.cos(v) * 0.35,
        q = (f * 128 + z) * 4;
      ((be.data[q] = 128 + re * 127),
        (be.data[q + 1] = 128 + T * 127),
        (be.data[q + 2] = 235),
        (be.data[q + 3] = 255));
    }
  le.putImageData(be, 0, 0);
  const E = new vt(Z);
  ((E.wrapS = E.wrapT = kt), E.repeat.set(70, 1));
  const Ee = new yt({
    color: 5002720,
    roughness: 0.58,
    sheen: 1,
    sheenRoughness: 0.45,
    sheenColor: new Nt(12172543),
    normalMap: E,
    normalScale: new jt(0.9, 0.9),
    envMapIntensity: 0.9,
  }),
    ie = new tt(new Mt(), Ee);
  ((ie.castShadow = !0), b.add(ie));
  const xe = [],
    ee = 56;
  for (let f = 0; f <= ee; f++) {
    const z = Math.PI + 0.42 + (f / ee) * (2 * Math.PI - 0.84);
    xe.push(
      new ue(
        Math.sin(z) + 2 * Math.sin(2 * z),
        Math.cos(z) - 2 * Math.cos(2 * z) + 1.2,
        -Math.sin(3 * z) * 1.1,
      ).multiplyScalar(0.42),
    );
  }
  let fe = 9;
  const Ae = (f) => {
    const z = xe[0].clone(),
      v = xe[xe.length - 1].clone(),
      _ = [
        new ue(-f, -0.35, 0.5),
        new ue(-f * 0.55, -0.25, 0.45),
        new ue(-1.6, v.y - 0.1, 0.4),
      ],
      re = [
        new ue(1.6, z.y - 0.1, -0.4),
        new ue(f * 0.55, -0.25, -0.45),
        new ue(f, -0.35, -0.5),
      ],
      T = [..._, ...[...xe].reverse(), ...re],
      q = [0];
    for (let G = 1; G < T.length; G++)
      q.push(q[G - 1] + T[G].distanceTo(T[G - 1]));
    const a = q[q.length - 1],
      Y = T.map((G, U) => new ue(-f + (2 * f * q[U]) / a, -0.3, 0));
    return { pts: T, straight: Y, s: q.map((G) => G / a) };
  };
  let Re = Ae(fe),
    de = -1;
  const ze = (f) => {
    const z = Re.pts.map((_, re) => {
      const T = Re.s[re],
        q = 1 - Math.abs(2 * T - 1),
        a = Math.min(1, Math.max(0, (f - q * 0.35) / 0.65)),
        Y = a * a * (3 - 2 * a),
        G = _.clone().lerp(Re.straight[re], Y);
      return ((G.z += Math.sin(Math.PI * Y) * 0.9 * q), G);
    }),
      v = new zt(
        new St(z, !1, "centripetal"),
        d > 1 ? 420 : 240,
        0.17,
        d > 1 ? 22 : 14,
        !1,
      );
    (ie.geometry.dispose(), (ie.geometry = v));
  },
    te = () => m.render(b, P),
    Se = () => {
      const f = o.clientWidth,
        z = o.clientHeight;
      if (!f || !z) return;
      (m.setSize(f, z, !1), (P.aspect = f / z), P.updateProjectionMatrix());
      const _ =
        Math.tan((P.fov * Math.PI) / 360) * P.position.z * P.aspect * 1.15;
      Math.abs(_ - fe) > 0.05
        ? ((fe = _), (Re = Ae(fe)), (ye = Math.max(0, de)), (de = -1), l())
        : te();
    };
  let ye = 0,
    t = 0;
  const l = () => {
    ((t = 0),
      !(Math.abs(ye - de) < 0.002) &&
      ((de = ye), (ie.rotation.y = -0.25 + de * 0.25), ze(de), te()));
  },
    n = (f) => {
      ((ye = f), t || (t = requestAnimationFrame(l)));
    },
    j = async (f) => {
      const z = o.width,
        v = o.height,
        _ = [0.16, 0.84],
        re = Math.round(v * _[0]),
        T = Math.round(v * (_[1] - _[0])),
        q = Math.min(1, 1280 / z),
        a = [],
        Y = document.createElement("canvas");
      ((Y.width = Math.round(z * q)), (Y.height = Math.round(T * q)));
      const G = Y.getContext("2d");
      for (let U = 0; U < f; U++) {
        const je = U / (f - 1);
        ((ie.rotation.y = -0.25 + je * 0.25), ze(je), te());
        const Ie = await createImageBitmap(o, 0, re, z, T, {
          resizeWidth: Y.width,
          resizeHeight: Y.height,
          resizeQuality: "high",
        });
        (G.clearRect(0, 0, Y.width, Y.height),
          G.drawImage(Ie, 0, 0),
          Ie.close(),
          a.push(
            await new Promise((C, I) =>
              Y.toBlob(
                (V) => (V ? C(V) : I(new Error("toBlob"))),
                "image/webp",
                0.88,
              ),
            ),
          ),
          U % 2 && (await new Promise((C) => requestAnimationFrame(C))));
      }
      return ((de = -1), { frames: a, band: _ });
    };
  return (
    Se(),
    (ye = 0),
    l(),
    {
      set: n,
      bake: j,
      resize: Se,
      dispose: () => {
        (cancelAnimationFrame(t),
          D.geometry.dispose(),
          D.material.dispose(),
          ie.geometry.dispose(),
          Ee.dispose(),
          E.dispose(),
          S.dispose(),
          O.dispose(),
          m.dispose());
      },
    }
  );
}
const oo = (o) => o.replace(/(-?\d*\.?\d+)R\b/g, "calc($1*var(--r))"),
  ro = oo(`
.or-root{--or-paper:#ffffff;--or-warm:#f6f3f1;--or-mint:#e9f6f1;--or-lilac:#dcd3f2;--or-lilac-soft:#f1ecf6;--or-blush:#f7c3b4;--or-ink:#0b0b0c;--or-mute:#8b8a90;--or-line:#e6e4e2;--or-night:#050505;--or-hi:#ffffff;--or-blush-soft:#fbf0ec;
  --r:min(calc(100cqw / 90),calc(100cqh / 56.25));
  position:relative;width:100%;height:var(--h);overflow:hidden;container-type:size;isolation:isolate;
  background:var(--or-paper);color:var(--or-ink);font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif;letter-spacing:-.02em;-webkit-font-smoothing:antialiased;cursor:auto}
.or-root.or-dark{--or-paper:#101012;--or-warm:#17161a;--or-mint:#10211d;--or-lilac:#2a2442;--or-lilac-soft:#1c1926;--or-ink:#f2f0ec;--or-mute:#8f8d96;--or-line:#2a2a2f;--or-hi:#b9a9ff;--or-blush-soft:#1c1617}
.or-root.or-stack{height:auto;overflow:visible;overflow-x:clip;container-type:normal;--r:min(calc(100vw / 24.375),17px)}
.or-root *,.or-root *::before,.or-root *::after{box-sizing:border-box}
.or-root img,.or-root video,.or-root canvas{max-width:none;display:block}
.or-root a{color:inherit;text-decoration:none}
.or-root button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.or-root :focus-visible{outline:2px solid #7c8cff;outline-offset:3px;border-radius:6px}
.or-probe{position:absolute;width:1R;height:0;visibility:hidden}
.or-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.or-spell .or-w{display:inline-block;white-space:nowrap}
.or-spell .or-l{display:inline-block}
.or-vid{width:100%;height:100%;object-fit:cover}

/* rolling text */
.or-roll{position:relative;display:inline-flex;overflow:hidden;vertical-align:top;padding-bottom:.08em}
.or-roll-s{opacity:0}
.or-roll-t{position:absolute;inset:0}
.or-roll-t>span{position:absolute;left:0;top:0;white-space:nowrap;transform-origin:0 100%;transition:transform .5s cubic-bezier(.3,.7,.2,1)}
.or-roll-t>span:last-child{transform:translateY(105%) rotate(8deg)}
.or-rl:hover .or-roll-t>span:first-child,.or-rl:focus-visible .or-roll-t>span:first-child{transform:translateY(-110%) rotate(-8deg)}
.or-rl:hover .or-roll-t>span:last-child,.or-rl:focus-visible .or-roll-t>span:last-child{transform:none}

/* header */
.or-header{position:absolute;z-index:40;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:2.6R 3.1R .8R;--hc:var(--or-ink);color:var(--hc);transition:color .3s;pointer-events:none}
.or-header[data-tone=dark]{--hc:#ffffff}
.or-header>*{pointer-events:auto}
.or-logo{display:flex;align-items:center;gap:.55R;font-weight:700;font-size:1.45R;letter-spacing:.02em}
.or-logo-m{width:1.2R;height:1.4R}
.or-nav{display:flex;gap:4.2R;font-size:1.15R;position:absolute;left:50%;transform:translateX(-50%)}
.or-head-r{display:flex;align-items:center;gap:2.6R}
.or-talk{flex-shrink:0;white-space:nowrap;display:inline-flex;align-items:center;gap:.5R;border:.12R solid var(--hc);border-radius:2R;padding:.55R 1.05R;font-size:.95R;font-weight:500;transition:border-color .3s}
.or-talk i{width:.42R;height:.42R;border-radius:50%;background:#7fd858;box-shadow:0 0 0 .2R rgb(127 216 88 / .2)}
.or-burger{display:inline-flex;align-items:center;gap:.7R;font-size:1.05R;font-weight:500}
.or-burger-t{display:inline-flex;flex-direction:column;height:1.3R;overflow:hidden;line-height:1.3R}
.or-burger-t>span{transition:transform .3s ease}
.or-burger.is-open .or-burger-t>span{transform:translateY(-100%)}
.or-burger-l{position:relative;width:1.95R;height:.9R}
.or-burger-l i{position:absolute;left:0;right:0;height:.13R;background:currentColor;top:.15R;transition:transform .3s ease,width .3s}
.or-burger-l i+i{top:.6R}
.or-burger.is-open .or-burger-l i{transform:translateY(.22R) rotate(45deg)}
.or-burger.is-open .or-burger-l i+i{transform:translateY(-.23R) rotate(-45deg)}
.or-menu-open .or-header{--hc:#0b0b0c;color:#0b0b0c}
.or-menu-open .or-rail,.or-rail.is-hidden{opacity:0!important;visibility:hidden!important;pointer-events:none!important}

/* scenes */
.or-scene{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;overscroll-behavior:contain;background:var(--or-paper)}
.or-scene::-webkit-scrollbar{display:none}
.or-stack .or-scene{position:relative;inset:auto;overflow:visible;overflow-x:clip}
.or-track{position:relative}
.or-stage{position:sticky;top:0;height:var(--h);overflow:hidden}

/* 0 home */
.or-home{position:relative;min-height:calc(var(--h) - 13R);padding:15R 9.375R 0}
.or-hero{font-family:"Bricolage Grotesque","Inter Tight",sans-serif;font-weight:500;font-size:3.45R;line-height:1.14;letter-spacing:-.035em;max-width:58R;margin:0;font-variation-settings:"opsz" 60}
.or-home-meta{display:flex;align-items:flex-start;gap:4R;margin-top:2.4R}
.or-rate{display:inline-flex;align-items:center;gap:.7R}
.or-rate-m{width:2.2R;height:2.5R;color:var(--or-ink)}
.or-rate>span{display:flex;flex-direction:column;gap:.15R}
.or-rate small{font-size:.85R;color:var(--or-ink)}
.or-stars{display:inline-flex;gap:.1R}
.or-stars svg{width:.95R;height:.95R;fill:#f2c84b}
.or-services{margin:0;max-width:24R;font-size:1R;line-height:1.3;color:var(--or-mute);text-transform:uppercase;letter-spacing:-.01em}
.or-deck-pill{margin-left:auto;align-self:center;display:inline-flex;background:var(--or-line);border-radius:3R;padding:.55R 1.1R;font-size:1.05R;letter-spacing:-.03em;transition:opacity .3s}
.or-deck-pill:hover{opacity:.8}
.or-eye-wrap{position:absolute;right:9.375R;top:13R;width:10.5R;height:10.5R}
.or-eye{width:100%;height:100%;overflow:visible}
.or-eye-ring{transform-origin:70px 70px;animation:or-spin 12s linear infinite}
.or-eye-ring text{font:700 10.6px "Inter Tight",sans-serif;letter-spacing:.14em;fill:#9d8ce0}
.or-lash path{stroke:#17171a;stroke-width:2.2;stroke-linecap:round;fill:none;transition:opacity .3s}
.or-lid{fill:#ffeeee;transition:transform .5s ease}
.or-lid-t{transform-origin:70px 42px;transform:scaleY(0)}
.or-lid-b{transform-origin:70px 98px;transform:scaleY(0)}
.or-eye.is-asleep .or-lid{transform:scaleY(1)}
.or-eye.is-asleep .or-lash{opacity:.25}
@keyframes or-spin{to{transform:rotate(360deg)}}
.or-reel-track{position:relative;height:calc(var(--h) * 1.25)}
.or-reel{position:sticky;top:0;height:var(--h)}
.or-reel-mask{position:absolute;inset:0;will-change:clip-path;transform:translateZ(0);clip-path:inset(0px 9.375R 16R 9.375R round 1.6R)}
.or-reel-in{position:absolute;inset:0;background:#c7d3e6}
.or-reel-cap{position:absolute;left:11R;bottom:20R;color:#fff;font-size:1R;opacity:.9}
.or-play{position:absolute;left:50%;top:calc(var(--h) / 2 - 8R);width:5.4R;height:5.4R;margin-left:-2.7R;border-radius:50%;background:#fff;display:grid;place-items:center}
.or-play i{width:0;height:0;border-left:.75R solid #000;border-top:.45R solid transparent;border-bottom:.45R solid transparent;margin-left:.2R}
.or-play.is-paused i{border-left-color:#000}
.or-play:not(.is-paused) i{width:.75R;height:.95R;border:0;border-left:.25R solid #000;border-right:.25R solid #000;margin:0}

/* 1 about */
.or-about-row{position:absolute;left:0;top:8.6R;bottom:1.4R;display:flex;gap:1.5R;padding-left:9.375R;padding-right:4R;will-change:transform}
.or-about-h{flex:none;width:30R;align-self:center;font-size:5.1R;font-weight:500;line-height:1.05;letter-spacing:-.05em;margin:0 0 6R}
.or-card{flex:none;position:relative;width:67.4R;height:100%;border-radius:3R;padding:4R 5R;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}
.or-card-rings{position:absolute;inset:-6R auto auto -4R;width:52R;height:52R;fill:none;stroke:#d0cfd4;stroke-width:1;opacity:.75;pointer-events:none}
.or-dark .or-card-rings{stroke:#3a3a42}
.or-card-pill{position:absolute;top:2R;left:2R;width:32R;height:15R;border-radius:13.5R;overflow:hidden;background:#e9e3f2}
.or-card-pill video{transform:scale(1.1)}
.or-card h3{position:relative;font-size:5R;line-height:1.08;font-weight:500;letter-spacing:-.05em;margin:0 0 1.6R;max-width:46R}
.or-card p{position:relative;font-size:1.25R;line-height:1.3;color:var(--or-mute);max-width:32R;margin:0}
.or-num{position:absolute;right:4.4R;bottom:2.8R;font-size:5.6R;font-weight:500;color:transparent;-webkit-text-stroke:1px #c9c7cc;letter-spacing:-.04em}

/* 2 make */
.or-s-make,.or-make{background:var(--or-warm)}
.or-make-track{height:calc(var(--h) * 4.2)}
.or-make-light{position:absolute;inset:0;background:var(--or-paper);opacity:0}
.or-grid{position:absolute;inset:0;background-image:linear-gradient(var(--or-line) 1px,transparent 1px),linear-gradient(90deg,var(--or-line) 1px,transparent 1px);background-size:5.6R 5.6R;background-position:center}
.or-grid::after{content:"";position:absolute;left:0;right:0;top:50%;border-top:1px dashed #b9b6bd}
.or-make-word{position:absolute;left:9.375R;top:50%;margin:-4.5R 0 0;font-size:7.5R;font-weight:700;letter-spacing:-.05em;text-transform:uppercase;transform-origin:0 50%;white-space:nowrap}
.or-make-media{position:absolute;inset:0;clip-path:inset(0px 0px 0px 100%);z-index:3}
.or-mock{position:absolute;left:50%;top:calc((var(--h) - 38R) / 2 + .5R);width:66R;height:38R;transform:translateX(-50%);border-radius:2.25R;background:#141416;overflow:hidden;opacity:0;visibility:hidden;color:#f4f3f6;z-index:2;box-shadow:0 2R 5R rgb(20 20 30 / .18)}
.or-mock-in{position:absolute;left:50%;top:0;width:66R;height:38R;margin-left:-33R}
.or-mock-in small{color:#8d8c96;font-size:.72R}
.or-m-top{position:absolute;left:1.5R;right:1.5R;top:1.2R;height:2.6R;display:flex;align-items:center;gap:1.4R;font-size:.82R}
.or-m-logo{width:1.2R;height:1.4R;color:#fff}
.or-m-tab{color:#8d8c96}
.or-m-tab.is-on{color:#fff;background:#26262b;padding:.35R .8R;border-radius:1R}
.or-m-search{margin-left:auto;background:#1f1f23;color:#76757e;border-radius:1R;padding:.4R 4R .4R 1R}
.or-m-faces{display:flex}
.or-m-faces img{width:1.8R;height:1.8R;border-radius:50%;border:.15R solid #141416;margin-left:-.5R;object-fit:cover}
.or-m-new{background:#5a6cff;border-radius:1R;padding:.45R .9R;font-weight:600}
.or-m-side{position:absolute;left:1.5R;top:5.5R;display:flex;flex-direction:column;gap:1R}
.or-m-side i{width:2.4R;height:2.4R;border-radius:.8R;background:#1f1f23}
.or-m-side i.is-on{background:#5a6cff}
.or-m-stats{position:absolute;left:5.5R;right:1.5R;top:5.5R;height:6R;display:grid;grid-template-columns:repeat(3,1fr);gap:1R}
.or-m-stat{position:relative;background:#1c1c20;border-radius:1.2R;padding:1R 1.2R;display:flex;flex-direction:column;justify-content:space-between}
.or-m-stat b{font-size:2R;letter-spacing:-.04em}
.or-m-stat span{position:absolute;right:1.2R;bottom:1.1R;width:5R;height:.4R;border-radius:1R}
.or-m-title{position:absolute;left:5.5R;top:12.6R;display:flex;flex-direction:column}
.or-m-title b{font-size:2.6R;letter-spacing:-.05em;line-height:1.1}
.or-m-col{position:absolute;top:17.5R;bottom:1.2R;background:#1a1a1e;border-radius:1.4R;padding:1R;display:flex;flex-direction:column;gap:.8R}
.or-m-col0{left:5.5R;width:16R}
.or-m-col1{left:22.5R;width:21R}
.or-m-col2{left:44.5R;width:16R}
.or-m-colh{display:flex;align-items:center;gap:.5R;font-size:.85R;font-weight:600}
.or-m-colh i{width:.5R;height:.5R;border-radius:50%}
.or-m-card{background:#232328;border-radius:1R;padding:.9R 1R;display:flex;flex-direction:column;gap:.35R;font-size:.9R}
.or-m-card-big{flex:1;position:relative}
.or-m-bar{height:.3R;background:#2f2f35;border-radius:1R;overflow:hidden;margin-top:.3R}
.or-m-bar span{display:block;height:100%}
.or-slot{position:absolute;left:1R;right:1R;bottom:1R;height:10.5R;border-radius:1R;overflow:hidden}
.or-skel{position:absolute;inset:0;background:#141416}
.or-skel i{position:absolute;border-radius:1R;background:linear-gradient(90deg,#1f1f23,#2a2a2f,#1f1f23);background-size:200% 100%;animation:or-shim 1.4s linear infinite}
@keyframes or-shim{to{background-position:-200% 0}}
.or-notch{position:absolute;left:50%;top:.7R;width:6R;height:1.3R;margin-left:-3R;border-radius:1R;background:#000;opacity:0}
.or-cur{position:absolute;left:50%;top:calc(var(--h) / 2);z-index:4;display:flex;align-items:flex-start;gap:.1R;opacity:0;pointer-events:none}
.or-cur svg{width:1.3R;height:1.45R;fill:var(--c);stroke:#fff;stroke-width:1.2}
.or-cur b{margin-top:1.1R;background:var(--c);color:#fff;font-size:.72R;font-weight:600;padding:.15R .5R;border-radius:.5R}
.or-tag{position:absolute;left:50%;top:calc((var(--h) - 38R) / 2 + 39.7R);width:23.6R;height:4.4R;margin-left:-11.8R;border-radius:2.2R;background:#fff;color:#0b0b0c;box-shadow:0 1R 3R rgb(0 0 0 / .08);overflow:hidden;opacity:0;transform:scale(.5);z-index:5}
.or-tag-l{position:absolute;inset:0;display:grid;place-items:center;font-size:1.1R;font-weight:500;text-transform:uppercase;letter-spacing:-.01em;opacity:0}

/* 3 people */
.or-s-people,.or-people{background:var(--or-lilac)}
.or-people-track{height:calc(var(--h) * 3)}
.or-people-h{position:absolute;inset:0;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:6R;line-height:8.2R;font-weight:700;letter-spacing:-.045em;text-transform:uppercase;text-align:center;z-index:2}
.or-pl{display:flex;align-items:center;white-space:nowrap}
.or-hi{color:var(--or-hi)}
.or-gap{position:relative;display:inline-flex;align-items:center;justify-content:center;height:6.4R;margin:0 .3em;width:0;overflow:visible}
.or-ava{position:absolute;left:0;top:50%;transform:translateY(-50%);display:flex;align-items:center;padding:.4R;border-radius:4R;background:rgb(255 255 255 / .9);opacity:0}
.or-ava>*{width:4.6R;height:4.6R;border-radius:50%;object-fit:cover;margin-left:-.8R;border:.2R solid #fff;flex:none;transform:scale(0)}
.or-ava>*:first-child{margin-left:0}
.or-ava b{display:grid;place-items:center;background:#17171a;color:#fff;font-size:1.3R;letter-spacing:0}
.or-gap-word{position:absolute;left:50%;top:50%;translate:-50% -50%;white-space:nowrap;opacity:0}
.or-fly{position:absolute;transform:translateY(calc(var(--h) * 1.2));width:24R;height:17R;object-fit:cover;border-radius:1.9R;box-shadow:0 2R 4R rgb(40 20 80 / .15);z-index:1}
.or-fly0{left:10R;top:10R}
.or-fly1{right:9R;top:4R;width:20R;height:24R}
.or-fly2{left:44R;top:22R;width:18R;height:14R}
.or-swallow{position:absolute;left:calc(100% - 4R);top:50%;width:calc(var(--h) * 4.6);height:calc(var(--h) * 4.6);margin:calc(var(--h) * -2.3) 0 0 calc(var(--h) * -2.3);border-radius:50%;background:var(--or-night);transform:scale(0);z-index:3}

/* 4 quote */
.or-s-quote,.or-quote,.or-s-work,.or-work,.or-s-rope,.or-rope{background:var(--or-night);color:#fff}
.or-quote-track{height:calc(var(--h) * 1.8)}
.or-qmark{position:absolute;left:8R;top:7R;font-family:"Bricolage Grotesque",serif;font-size:16R;line-height:1;color:#5f5f62}
.or-q{position:absolute;left:12R;top:15.5R;width:44R;margin:0;font-size:4.5R;line-height:1.14;letter-spacing:-.04em;color:#57575b}
.or-q .or-l{transition:color .25s}
.or-q .or-l.is-lit{color:#fff}
.or-ring-c{position:absolute;right:-6R;width:28.75R;height:28.75R;border-radius:50%;background:#121212}
.or-ring-c0{top:-14R}
.or-ring-c1{top:14R}
.or-ring-c2{top:42R}
.or-qbar{position:absolute;right:12R;top:20R;width:.25R;height:15.6R;background:#3c3c40;border-radius:1R;overflow:hidden}
.or-qbar i{position:absolute;inset:0;background:#fff;transform-origin:top;transform:scaleY(0)}
.or-qcap{position:absolute;right:5.5R;bottom:6R;width:20R;margin:0;font-size:.95R;line-height:1.35;color:#8b8a90;text-align:right}

/* 5 work */
.or-work-track{height:calc(var(--h) * 2.2)}
.or-work-k{position:absolute;left:9.375R;top:9R;margin:0;font-size:1R;color:#8b8a90}
.or-car-wrap{position:absolute;inset:0}
.or-car{position:absolute;inset:0;touch-action:pan-y;user-select:none}
.or-car-ring{position:absolute;left:50%;top:calc(var(--h) / 2 - 1R);width:0;height:0}
.or-car-card{position:absolute;left:-18.8R;top:-12.7R;width:37.6R;height:25.4R;margin:0;border-radius:1.4R;overflow:hidden;cursor:grab;transform:translateX(calc(var(--d) * 42R)) scale(calc(1 - min(1, max(var(--d), -1 * var(--d))) * .12));transition:transform .8s cubic-bezier(.6,0,.2,1),opacity .5s}
.or-car-card img{width:100%;height:100%;object-fit:cover;pointer-events:none}
.or-car-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgb(27 26 26 / 0) 40%,#1b1a1a)}
.or-car-meta{position:absolute;left:1.4R;right:1.4R;top:1.2R;display:flex;justify-content:space-between;z-index:1}
.or-car-meta span{border:1px solid rgb(255 255 255 / .55);border-radius:2R;padding:.3R .8R;font-size:.8R;backdrop-filter:blur(6px)}
.or-car-title{position:absolute;left:calc(50% - 21.8R);top:calc(var(--h) / 2 + 6.8R);margin:0;font-family:"Bricolage Grotesque",sans-serif;font-size:4.4R;line-height:1;font-weight:600;letter-spacing:-.04em;text-transform:uppercase;pointer-events:none;z-index:2}
.or-car-title .or-l{animation:or-up .5s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i) * 30ms)}
.or-car-foot{position:absolute;left:9.375R;bottom:3.4R;display:flex;align-items:center;gap:1.4R}
.or-car-bars{display:flex;gap:.4R}
.or-car-bars span{width:1.25R;height:.19R;background:#4a4a4f;border-radius:1R;transition:width .5s ease,background .5s}
.or-car-bars span.is-on{width:4.2R;background:#fff}
.or-car-count{white-space:nowrap;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:1.1R}
.or-car-btn{width:3.4R;height:3.4R;border-radius:50%;border:1px solid #4a4a4f;font-size:1.2R;transition:border-color .3s}
.or-car-btn:hover{border-color:#fff}
.or-hand{position:absolute;right:6R;bottom:5R;width:9R;height:9R;border-radius:50%;overflow:hidden;border:.12R solid #fff}
.or-work-lift{position:absolute;inset:0}
.or-thread{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.or-thread path{fill:none;stroke:#fff;stroke-width:2.2;stroke-dasharray:1;stroke-dashoffset:1}
.or-slit{position:absolute;inset:0;background:var(--or-paper);transform:scaleX(0) scaleY(0);transform-origin:50% 0}
@keyframes or-up{from{transform:translateY(70%);opacity:0}}

/* 6 proof */
.or-proof-track{height:calc(var(--h) * 2)}
.or-bubbles{position:absolute;inset:0;width:100%;height:100%}
.or-blob{position:absolute;left:-12R;top:-12R;width:24R;height:24R;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#dad2f4 0 30%,#c9d2f2 45%,rgb(220 210 244 / 0) 70%);opacity:.75;filter:blur(1.5R)}
.or-dark .or-blob{opacity:.25}
.or-cube-wrap{position:absolute;inset:0;perspective:50R;display:grid;place-items:center}
.or-cube{position:relative;width:40R;height:38R;transform-style:preserve-3d;margin-top:3R;translate:0 0 -20R}
.or-face{position:absolute;inset:0;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;justify-content:center;backface-visibility:hidden;text-transform:uppercase;font-weight:800;letter-spacing:-.03em;background:var(--or-paper)}
.or-face-a{transform:translateZ(20R);font-size:2.42R;line-height:1.06;gap:.04R;white-space:nowrap}
.or-face-a em{font-style:normal;color:#9c90d8}
.or-face-a .is-hi{color:#9c90d8}
.or-face-b{transform:rotateY(90deg) translateZ(20R);font-size:3.9R;line-height:1.04}
.or-face-b li:first-child{color:#8f84d6}
.or-face-b a:hover{color:#a996f2}

/* 7 rope */
.or-rope-track{height:calc(var(--h) * 2.8)}
.or-rope-fill{position:absolute;inset:0;background:#9e99a8;opacity:0}
.or-rope-bg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.or-rope-bg path{fill:none;stroke:#47474c;stroke-width:1.4;stroke-dasharray:1;stroke-dashoffset:1}
.or-dark .or-rope-fill{background:#2c2638}
.or-rope-line{position:absolute;left:50%;top:15.5R;width:42R;margin:0 0 0 -21R;text-align:center;font-size:2.5R;line-height:1.2;letter-spacing:-.04em;z-index:2}
.or-squircle{position:absolute;left:50%;top:calc(50% + 4R);width:28R;height:19R;translate:-50% -50%;border-radius:7R;overflow:hidden;z-index:3;background:radial-gradient(120% 90% at 50% 40%,#eee8f6,#dcd2ee 55%,#cbbfe3)}
.or-dark .or-squircle{background:radial-gradient(120% 90% at 50% 40%,#3a3350,#2a2440)}
.or-rope-c,.or-rope-seq{position:absolute;left:50%;top:50%;width:100cqw;height:var(--h);translate:-50% -50%}
.or-rope-seq{display:none}
.or-seq-on .or-rope-seq{display:block}
.or-seq-on .or-rope-c{visibility:hidden}
.or-idea{position:absolute;left:0;right:0;top:50%;margin:-8.4R 0 0;display:flex;flex-direction:column;align-items:center;text-align:center;font-size:7R;line-height:1.08;font-weight:300;letter-spacing:-.04em;color:#fff;text-transform:uppercase;text-shadow:0 .5R 3R rgb(60 40 120 / .25)}
.or-idea .or-l{opacity:0}
.or-marq{position:absolute;left:0;right:0;bottom:3R;overflow:hidden;opacity:0;color:#5d5670;mask-image:linear-gradient(90deg,transparent,#000 15%,#000 85%,transparent)}
.or-marq>div{display:flex;gap:4R;width:max-content;animation:or-marq 40s linear infinite}
.or-marq span{font-size:1.3R;font-weight:700;letter-spacing:-.03em;white-space:nowrap}
.or-marq span:nth-child(3n){font-family:"Bricolage Grotesque",serif;font-weight:500;font-style:italic}
@keyframes or-marq{to{transform:translateX(-50%)}}

/* 8 contact */
.or-contact{display:grid;grid-template-columns:33R 1fr;gap:3R;padding:15R 9.375R 6R}
.or-contact-h{margin:0;font-size:2.6R;line-height:1.2;font-weight:500;letter-spacing:-.04em}
.or-contact-h .or-contact-face{display:inline-block;width:3.2R;height:3.2R;border-radius:50%;object-fit:cover;vertical-align:middle;background:#f2c84b}
.or-trust,.or-follow{margin-top:3R;display:flex;flex-direction:column;gap:.9R}
.or-trust>small,.or-follow>small{font-size:1R;color:var(--or-mute)}
.or-follow>span{display:flex;gap:.6R}
.or-social{width:3R;height:3R;border-radius:50%;border:1px solid var(--or-line);display:grid;place-items:center;font-size:.8R;font-weight:600;transition:border-color .4s}
.or-social:hover{border-color:#bcbcbc}
.or-sheet-open{display:none}
.or-sheet-x{display:none}
.or-form{display:flex;flex-direction:column;gap:2.2R}
.or-form-row{display:grid;grid-template-columns:1fr 1fr;gap:3R}
.or-field{display:flex;flex-direction:column;gap:.7R;font-size:.95R;font-weight:500}
.or-field input,.or-field textarea{font:inherit;font-weight:400;font-size:1.05R;color:inherit;background:none;border:0;border-bottom:1px solid var(--or-line);padding:.6R 0;outline:none;resize:none;transition:border-color .4s}
.or-field input:focus,.or-field textarea:focus{border-color:var(--or-ink)}
.or-field input::placeholder,.or-field textarea::placeholder{color:#a3a2a8}
.or-chips{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.9R}
.or-chips legend{font-size:.95R;font-weight:500;margin-bottom:1R;padding:0}
.or-chip{position:relative;display:inline-flex;border:1.5px solid var(--or-line);border-radius:3.75R;padding:.9R 1.7R;font-size:.95R;cursor:pointer;transition:border-color .3s,background .3s}
.or-chip:hover{border-color:#bcbcbc}
.or-chip.is-on{border-color:var(--or-ink);background:var(--or-ink);color:var(--or-paper)}
.or-chip input{position:absolute;opacity:0;pointer-events:none}
.or-chip:has(input:focus-visible){outline:2px solid #7c8cff;outline-offset:3px}
.or-submit-row{display:flex;align-items:center;gap:2R;margin-top:.6R}
.or-pulse{position:relative;display:inline-flex}
.or-pulse i{position:absolute;inset:0;border-radius:6R;border:1px solid #bcbcbc;opacity:0}
.or-pulse:hover i{animation:or-wave 1.5s ease infinite}
.or-pulse i:nth-child(2){animation-delay:.375s}
.or-pulse i:nth-child(3){animation-delay:.75s}
.or-pulse i:nth-child(4){animation-delay:1.125s}
.or-pulse::after{content:"";position:absolute;inset:0;border-radius:6R;border:1px solid #bcbcbc;animation:or-wave 3s ease infinite;pointer-events:none}
@keyframes or-wave{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.15,1.4)}}
.or-submit{position:relative;background:var(--or-ink)!important;color:var(--or-paper)!important;border-radius:6R!important;padding:1.6R 3.4R!important;font-size:1.15R!important;font-weight:500}
.or-submit span{display:inline-block;transition:transform .3s}
.or-submit span:nth-child(2){transform:rotate(8.6deg)}
.or-submit span:nth-child(3){transform:rotate(-8.4deg)}
.or-submit:hover span{transform:none}
.or-sent{margin:0;font-size:1R;color:var(--or-mute);max-width:22R}
.or-foot{padding:4R 9.375R 3R;border-top:1px solid var(--or-line);margin:0 0 0}
.or-foot-big{display:flex;align-items:center;gap:1.5R;font-size:17R;line-height:.9;font-weight:700;letter-spacing:-.08em}
.or-foot-m{width:10R;height:12R}
.or-foot-row{display:flex;align-items:flex-end;gap:4R;margin-top:3R;font-size:1R;color:var(--or-mute)}
.or-foot-row address{font-style:normal;line-height:1.4}
.or-foot-row small{margin-left:auto;font-size:.9R}
.or-foot-row .or-deck-pill{margin-left:0;color:var(--or-ink)}
.or-under{position:relative;color:var(--or-ink);padding-bottom:.3R;background:linear-gradient(currentColor,currentColor) 50% 100%/0 1px no-repeat,linear-gradient(rgb(128 128 128 / .3),rgb(128 128 128 / .3)) 0 100%/100% 1px no-repeat;transition:background-size .5s ease}
.or-under:hover{background-size:100% 1px,100% 1px}

/* overlays */
.or-flash{position:absolute;inset:0;z-index:30;background:#000;overflow:hidden;visibility:hidden;opacity:0;pointer-events:none}
.or-flash-in{position:absolute;left:-30%;top:-28%;width:160%;rotate:-15deg}
.or-flash-row{width:max-content;font-size:11R;line-height:12.4R;font-weight:800;letter-spacing:-.04em;color:var(--or-blush);white-space:nowrap}
.or-jump{position:absolute;inset:0;z-index:60;visibility:hidden;opacity:0;pointer-events:none;display:grid;place-items:center;--dc:#0b0b0c;--lc:#ffffff}
.or-jump[data-c=light]{--dc:#ffffff;--lc:#0b0b0c}
.or-jump-disc{position:absolute;left:50%;top:50%;width:max(150cqw,150cqh);height:max(150cqw,150cqh);margin:calc(max(150cqw,150cqh) / -2) 0 0 calc(max(150cqw,150cqh) / -2);border-radius:50%;background:var(--dc)}
.or-jump-logo{position:relative;width:24R;height:7.2R;overflow:visible}
.or-jump-logo path,.or-jump-logo text{fill:none;stroke:var(--lc);stroke-width:3;stroke-dasharray:420;stroke-dashoffset:420}
.or-jump-logo text{font:700 76px "Inter Tight",sans-serif;letter-spacing:-.06em;stroke-width:1.6}

/* menu */
.or-menu{position:absolute;inset:0;z-index:35;display:grid;grid-template-columns:1fr 18R 1fr;align-items:center;gap:6R;padding:9R 3.1R 3R;background:linear-gradient(203.7deg,#fff 48.1%,#eeebeb 86%);color:#0b0b0c;opacity:0;visibility:hidden;transform:translate(10%,-150%) rotate(12deg) scale(1.5);transition:transform .75s ease,visibility .75s ease,opacity .3s .5s}
.or-menu.is-open{opacity:1;visibility:visible;transform:none;transition:transform .75s ease,visibility .75s ease,opacity .3s}
.or-menu>*{opacity:0;transform:translateY(-6R);transition:transform .75s ease .3s,opacity .75s .3s}
.or-menu.is-open>*{opacity:1;transform:none}
.or-menu small{display:block;font-size:.85R;color:#9e9e9e;margin-bottom:1.2R}
.or-menu-social{display:flex;flex-direction:column;gap:.6R;font-size:1R;align-self:stretch;justify-content:center}
.or-menu-mail{margin-top:5R}
.or-menu-prev{position:relative;height:27R;border-radius:.4R;overflow:hidden}
.or-menu-p{position:absolute;top:0;bottom:0;left:0;max-width:0;width:100%;overflow:hidden;transition:max-width .3s ease}
.or-menu-p.is-on{left:auto;right:0;max-width:100%;transition:max-width .5s ease}
.or-menu-p>*{position:absolute;right:0;top:0;width:18R;height:27R;object-fit:cover;display:block}
.or-menu-links{display:flex;flex-direction:column;gap:.4R;font-size:3.5R;letter-spacing:-.045em}

/* floating contact chips with a brushed-metal edge */
.or-float{position:absolute;right:1.4R;bottom:1.4R;z-index:45;display:flex;flex-direction:column;align-items:flex-end;gap:1R}
.or-metal{display:inline-flex;align-items:center;justify-content:center;gap:.5R;color:#26272b;background:linear-gradient(32deg,#b8c2ce,#fff 50%) padding-box,linear-gradient(80deg,#737989,#fbffff,#fbffff,#707988) border-box;border:1.5px solid transparent;box-shadow:0 .25R .75R .5R rgb(0 0 0 / .08);transition:transform .2s ease}
.or-metal:hover{transform:scale(1.08)}
.or-metal svg{width:1.3R;height:1.3R;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round}
.or-metal-o{width:3.1R;height:3.1R;border-radius:50%}
.or-dark .or-metal{color:#ecebf0;background:linear-gradient(32deg,#24262b,#4a4d56 50%) padding-box,linear-gradient(80deg,#4c5160,#c7ccd6,#c7ccd6,#4b505e) border-box;box-shadow:0 .25R .75R .5R rgb(0 0 0 / .35)}
.or-rail{position:absolute;left:3.1R;top:calc(var(--h) / 2 - 7R);display:flex;flex-direction:column;gap:.2R;transition:opacity .3s ease,visibility .3s ease}
.or-rail button{display:flex;align-items:center;gap:.7R;height:1.35R;color:inherit}
.or-rail i{display:block;width:.9R;height:1.5px;background:currentColor;opacity:.35;transition:width .5s cubic-bezier(.3,.7,.2,1),opacity .3s}
.or-rail span{font-size:.75R;letter-spacing:0;opacity:0;translate:-.4R 0;transition:opacity .3s,translate .3s;white-space:nowrap}
.or-rail button.is-on i{width:2.2R;opacity:1}
.or-rail button:hover span,.or-rail button:focus-visible span{opacity:.8;translate:0 0}
.or-stack .or-rail{display:none}
.or-metal-p{border-radius:2R;padding:.5R 1R;font-size:.88R}
.or-metal-p svg{width:1R;height:1R}

/* cursor */
.or-dot{position:fixed;left:-.31R;top:-.31R;width:.62R;height:.62R;z-index:100;pointer-events:none;mix-blend-mode:difference;display:none}
.or-scrolling .or-dot{mix-blend-mode:normal;opacity:0}
.or-dot::before{content:"";position:absolute;left:50%;top:50%;width:100%;height:100%;border-radius:50%;background:#fff;translate:-50% -50%;transition:width .3s ease,height .3s ease}
.or-live:not(.or-stack) .or-dot{display:block}
.or-dot[data-k=nav]::before{width:6R;height:6R}
.or-dot[data-k=menu]::before{width:5R;height:5R}
.or-dot[data-k=button]::before{width:12R;height:12R}

/* ---- stacked: phones, touch, reduced motion ---- */
.or-stack .or-header{position:fixed;padding:1.2R 1.25R;background:rgb(255 255 255 / .78);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);transition:color .3s,background-color .3s}
.or-stack .or-header[data-tone=dark]{background:rgb(8 8 9 / .62)}
.or-stack .or-nav,.or-stack .or-talk{display:none}
.or-stack .or-logo{font-size:1.25R;letter-spacing:.02em}
.or-stack .or-home{min-height:0;padding:7R 1.25R 2R}
.or-stack .or-hero{font-size:1.9R;line-height:1.2}
.or-stack .or-home-meta{flex-wrap:wrap;gap:1.4R}
.or-stack .or-deck-pill{margin-left:0}
.or-stack .or-eye-wrap{display:none}
.or-stack .or-reel-track{height:auto;padding:0 1.25R}
.or-stack .or-reel{position:relative;height:auto;aspect-ratio:4/5}
.or-stack .or-reel-mask{clip-path:inset(0 round 1.2R)}
.or-stack .or-reel-cap{left:1.2R;bottom:1.2R}
.or-stack .or-play{top:50%;margin-top:-2.7R}
.or-stack .or-about-track{height:auto!important}
.or-stack .or-s-about .or-stage{position:relative;height:auto;overflow:visible}
.or-stack .or-about-row{position:relative;top:0;flex-direction:column;padding:4R 1.25R 2R;gap:1.2R;transform:none!important}
.or-stack .or-about-h{width:auto;font-size:2.6R;margin:0 0 1R;align-self:flex-start}
.or-stack .or-card{width:auto;height:auto;min-height:30R;border-radius:1.2R;padding:13R 1.4R 1.6R}
.or-stack .or-card-pill{left:1R;right:1R;width:auto;height:10.5R;top:1R}
.or-stack .or-card h3{font-size:1.75R}
.or-stack .or-card p{font-size:.95R}
.or-stack .or-num{font-size:2.4R;right:1.4R;bottom:1.4R}
.or-stack .or-make-track{height:calc(var(--h) * 3.4)}
.or-stack .or-make-word{left:1.25R;font-size:3.6R;margin-top:-2R}
.or-stack .or-mock,.or-stack .or-tag,.or-stack .or-cur{zoom:.34}
.or-stack .or-cur{zoom:.6}
.or-stack .or-tag{zoom:.7;top:calc(var(--h) / 2 / .7 + 10.5R)}
.or-stack .or-cube{translate:0 0 -8.5R}
.or-stack .or-mock{top:calc(var(--h) / 2 / .34 - 19R)}
.or-stack .or-people-track{height:calc(var(--h) * 3)}
.or-stack .or-people-h{font-size:1.6R;line-height:2.6R}
.or-stack .or-gap{height:2.6R}
.or-stack .or-ava{padding:.15R}
.or-stack .or-ava>*{width:1.9R;height:1.9R;margin-left:-.45R;border-width:.1R}
.or-stack .or-ava b{font-size:.6R}
.or-stack .or-fly{width:11R;height:8R}
.or-stack .or-fly1{right:1R;width:9R;height:11R}
.or-stack .or-fly2{left:8R}
.or-stack .or-quote-track{height:calc(var(--h) * 2)}
.or-stack .or-qmark{left:1R;top:5R;font-size:8R}
.or-stack .or-q{left:1.25R;right:1.25R;width:auto;top:11R;font-size:2.1R}
.or-stack .or-ring-c{width:14R;height:14R;right:-8R}
.or-stack .or-qbar{right:1.25R;top:auto;bottom:12R;height:7R}
.or-stack .or-qcap{left:1.25R;right:3R;width:auto;bottom:4R;text-align:left}
.or-stack .or-work-track{height:auto}
.or-stack .or-work{position:relative;height:auto;min-height:44R}
.or-stack .or-work-k{left:1.25R;top:5R}
.or-stack .or-car-ring{top:20R}
.or-stack .or-car-card{left:-10.5R;top:-7.5R;width:21R;height:15R;transform:translateX(calc(var(--d) * 22.5R)) scale(calc(1 - min(1, max(var(--d), -1 * var(--d))) * .12))}
.or-stack .or-car-title{left:1.25R;top:27R;font-size:2.4R}
.or-stack .or-car-foot{left:1.25R;bottom:3R;gap:1R}
.or-stack .or-thread,.or-stack .or-slit,.or-stack .or-hand{display:none}
.or-stack .or-proof-track{height:calc(var(--h) * 2.2)}
.or-stack .or-cube{width:17R;height:17R}
.or-stack .or-face-a{transform:translateZ(8.5R);font-size:1R}
.or-stack .or-face-b{transform:rotateY(90deg) translateZ(8.5R);font-size:1.65R}
.or-stack .or-blob{display:none}
.or-stack .or-rope-track{height:calc(var(--h) * 2.6)}
.or-stack .or-rope-line{width:auto;left:1.25R;right:1.25R;margin:0;top:6.5R;font-size:1.5R}
.or-stack .or-idea{font-size:2.6R;margin-top:-3R}
.or-stack .or-squircle{width:20R;height:14R;border-radius:4.5R}
.or-stack .or-rope-line{top:6.5R}
.or-stack .or-contact{grid-template-columns:1fr;padding:7R 1.25R 3R}
.or-stack .or-contact-h{font-size:1.75R}
.or-stack .or-contact-h .or-contact-face{width:2.3R;height:2.3R}
.or-stack .or-sheet-open{display:inline-flex;margin-top:2.4R;align-self:flex-start;background:var(--or-ink);color:var(--or-paper);border-radius:3R;padding:1R 2R;font-size:1R;font-weight:500}
.or-stack .or-sheet{position:fixed;left:0;right:0;bottom:0;z-index:70;max-height:88svh;overflow:auto;background:var(--or-paper);border-radius:1.6R 1.6R 0 0;padding:3R 1.25R 2R;box-shadow:0 -1R 4R rgb(0 0 0 / .15);transform:translateY(105%);transition:transform .5s ease}
.or-stack .or-sheet.is-open{transform:none}
.or-stack .or-sheet-x{display:grid;place-items:center;position:absolute;right:1R;top:.8R;width:2.6R;height:2.6R;border-radius:50%;background:var(--or-line);font-size:1.4R}
.or-stack .or-form-row{grid-template-columns:1fr;gap:1.4R}
.or-stack .or-chip{padding:.7R 1.1R}
.or-stack .or-submit{padding:1.2R 2.4R!important}
.or-stack .or-foot{padding:3R 1.25R 6R}
.or-stack .or-foot-big{font-size:6R}
.or-stack .or-foot-m{width:3.5R;height:4R}
.or-stack .or-foot-row{flex-wrap:wrap;gap:1.4R}
.or-stack .or-menu{position:fixed;grid-template-columns:1fr;padding:7R 1.25R 2R;gap:2R;align-content:start}
.or-stack .or-menu-prev{display:none}
.or-stack .or-menu-links{order:-1;font-size:2.4R}
.or-stack .or-float{position:fixed;right:1R;bottom:1R}
.or-stack .or-flash,.or-stack .or-jump{position:fixed}
.or-reduced .or-eye-ring,.or-reduced .or-marq>div,.or-reduced .or-skel i{animation:none}
.or-reduced .or-pulse::after,.or-reduced .or-pulse i{animation:none!important}
.or-reduced .or-roll-t>span,.or-reduced .or-menu,.or-reduced .or-menu>*{transition-duration:.01s!important}
.or-reduced .or-idea .or-l{opacity:1}
@media (prefers-reduced-motion:reduce){.or-root *{scroll-behavior:auto}}
`);
function co() {
  return e.jsx("div", { className: "w-full", children: e.jsx(eo, {}) });
}
export { co as default };
