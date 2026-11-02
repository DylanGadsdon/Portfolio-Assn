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
    body: `Write-up coming soon.`,
  },
  {
    title: 'GTA VI: the trailer',
    category: 'Film',
    featured: true,
    video_url: '',   // ← YouTube link goes here
    body: `Write-up coming soon.`,
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
