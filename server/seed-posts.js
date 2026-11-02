// server/seed-posts.js — the starting journal entries, used once to fill the
// database (npm run db:setup, only when the posts table is empty).
//
// featured: true → the piece is frozen into the iceberg on the front page.
// video_url: a YouTube link. link_url: an outside link (e.g. a Figma site).

export const seedPosts = [
  {
    title: 'The panther, the tortoise and the alligator',
    category: 'Film',
    featured: true,
    video_url: '',   // ← YouTube link goes here
    body: `A short AI film that started with the very first image I ever made in Midjourney: a black panther and a tortoise crossing a New York street, with a line of classic cars waiting at the lights.

I rebuilt that frame from scratch and used it as the starting point for video, then let the story grow from there, alligator included.

Made with Midjourney for the look, then animated as short clips and cut together.`,
  },
  {
    title: 'GTA VI: the trailer',
    category: 'Film',
    featured: true,
    video_url: '',   // ← YouTube link goes here
    body: `A fan trailer built entirely with AI.

Jason and Lucia rob a sun-bleached Florida convenience store, then burst into the next shop to do it again. Inside: an older Franklin, with Chop at his feet, buying a boxed copy of GTA VI. He turns round and recognises them straight away. Jason doesn't recognise himself, even with his own face on the cover.

An old protagonist telling the new one he's famous.`,
  },
  {
    title: 'Kill the opera',
    category: 'Campaign',
    featured: false,
    link_url: '',    // ← Figma link goes here
    body: `The brief: accept that opera is dying in Sweden and come up with a way to stop it.

Our group's pitch, which I proposed and pushed for, was "kill the opera". Stop protecting the form as it is and break it open into the interactive media formats young people already live in.

The point isn't to dumb it down. It's to get it out of the pigeonhole it's been put in.`,
  },
];
