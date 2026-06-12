// Single source of truth for the résumé: world-space layout + spoken dialogue.
// The ground plane is 30 wide (x: -15..15) and 42 deep (z: -21..21).
// z = -21 is the TOP of the page, z = +21 the bottom.

export const PAGE = { width: 30, depth: 42 };

// Section heading blocks (3D obstacles). z = row centre on the page.
export const HEADINGS = [
  { id: 'h-education', label: 'EDUCATION', z: -16.2 },
  { id: 'h-experience', label: 'WORK EXPERIENCE', z: -10.6 },
  { id: 'h-awards', label: 'AWARDS', z: -5.0 },
  { id: 'h-projects', label: 'PROJECTS', z: -1.6 },
  { id: 'h-certs', label: 'CERTIFICATIONS', z: 11.6 },
  { id: 'h-skills', label: 'TECHNICAL SKILLS', z: 15.2 },
];

export const RESUME_SECTIONS = [
  {
    id: 'header',
    label: 'Name & Title',
    worldBox: { x: -14, z: -20.7, width: 28, depth: 2.7 },
    type: 'header',
    dialogue: `That's him — Shrivatsa Atman Trivedi. Full-stack and AI developer, B.Tech student at Manipal University Jaipur, class of 2026. This entire sheet of paper you're standing on? His résumé. Mind the ink.`,
    link: null,
  },
  {
    id: 'contact',
    label: 'Contact Info',
    worldBox: { x: -14, z: -18.0, width: 28, depth: 1.6 },
    type: 'contact',
    dialogue: `You can reach him at shrivatsatrivedi@gmail.com, or call 7045103001. He's on LinkedIn as /in/shrivatsa, and he ships code on GitHub.`,
    link: { text: 'View GitHub Profile', url: 'https://github.com/shrivatsatrivedi' },
  },
  {
    id: 'education',
    label: 'Education',
    worldBox: { x: -14, z: -15.8, width: 28, depth: 4.5 },
    type: 'education',
    dialogue: `He's doing his Bachelor of Technology at Manipal University Jaipur, 2022 to 2026. Before that: Jai Hind College, Mumbai for his HSC, and Campion School, Mumbai for his ICSE. Mumbai kid, Jaipur trained.`,
    link: null,
  },
  {
    id: 'experience-glance',
    label: 'Work Experience — Glance (InMobi Group)',
    worldBox: { x: -14, z: -10.0, width: 28, depth: 4.2 },
    type: 'experience',
    dialogue: `Summer 2025 — Software Engineer Intern, Android, at Glance (InMobi Group) in Bengaluru. He engineered a multi-faceted login system with country-wise and age-based compliance logic that's now live on Android AND iOS, worked shoulder-to-shoulder with backend, product and QA, and hunted edge-case bugs in a large-scale production codebase.`,
    link: { text: 'Connect on LinkedIn', url: 'https://linkedin.com/in/shrivatsa' },
  },
  {
    id: 'awards',
    label: "Awards — Dean's List",
    worldBox: { x: -14, z: -4.5, width: 28, depth: 2.2 },
    type: 'header',
    dialogue: `Dean's List. He received the Dean's Excellence Award for the highest band GPA in the Department of Computer & Communication Engineering. He'll tell you it's no big deal. It is.`,
    link: null,
  },
  {
    id: 'project-emotion',
    label: 'Project — Emotion-Aware Conversational AI',
    worldBox: { x: -14, z: -1.0, width: 28, depth: 3.0 },
    type: 'project',
    dialogue: `Emotion-Aware Conversational AI, August 2025. DeepFace reads your facial emotions from live video, OpenAI GPT replies with actual empathy, and the whole thing runs as an interactive Streamlit app with a live camera feed.`,
    link: { text: 'View the Code', url: 'https://github.com/shrivatsatrivedi/EmotionAwareLLM-Frontend' },
  },
  {
    id: 'project-focus',
    label: 'Project — FocusCycle Pomodoro',
    worldBox: { x: -14, z: 3.0, width: 28, depth: 4.0 },
    type: 'project',
    dialogue: `FocusCycle Pomodoro — a productivity app with an accountability buddy. MediaPipe BlazeFace face-detection and tab-switch monitoring keep you honest, passwordless JWT email links log you in, and Vercel KV handles real-time exit approvals. Built on Next.js + TypeScript. It's deployed and live right now.`,
    link: { text: 'Try It Live', url: 'https://focus-partner.vercel.app/' },
  },
  {
    id: 'project-mern',
    label: 'Project — MERN Blog Application',
    worldBox: { x: -14, z: 7.5, width: 28, depth: 3.3 },
    type: 'project',
    dialogue: `A full-stack MERN blog, November 2024 — JWT-based auth, RESTful Express.js APIs, a responsive React front end, and MongoDB underneath doing the heavy lifting.`,
    link: { text: 'View the Code', url: 'https://github.com/shrivatsatrivedi/blog-app' },
  },
  {
    id: 'certifications',
    label: 'Certifications',
    worldBox: { x: -14, z: 12.3, width: 28, depth: 2.2 },
    type: 'education',
    dialogue: `Foundations of Data Science from Google, and Introduction to Software Engineering from IBM — both via Coursera, October 2024.`,
    link: null,
  },
  {
    id: 'skills',
    label: 'Technical Skills',
    worldBox: { x: -14, z: 15.9, width: 28, depth: 3.2 },
    type: 'skill',
    dialogue: `His toolkit: Java, Python, C and C++, JavaScript, HTML/CSS. Frameworks: React, Express.js, Node.js. Database: MongoDB. Currently deep in the AI rabbit hole — you're literally standing inside the proof.`,
    link: null,
  },
];

export const GREETING = `Hello. Walk around. Click on anything. I'll tell you everything.`;

export function sectionAt(x, z) {
  for (const s of RESUME_SECTIONS) {
    const b = s.worldBox;
    if (x >= b.x && x <= b.x + b.width && z >= b.z && z <= b.z + b.depth) return s;
  }
  return null;
}
