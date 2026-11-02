// server/seed-posts.js
// The starting journal entries. In stage 1 the server reads these directly;
// from stage 2 they're only used once, to fill the database.
// Edit freely — they're written as first drafts.

export const seedPosts = [
  {
    title: 'Door 24: the Groundhog Elf',
    category: 'Film',
    body: `A projection advent calendar on a firewall at Åsögatan 148, and one door left to fill: number 24.

My answer is a grumpy elf whose front door happens to be advent door 24. Every year the whole city counts down to his doorstep, and every year he has to deal with it.

The film is 30–35 seconds, vertical 9:16, made to look like stop-motion even though it's AI-generated. The elf is Schminkel, a character I built and keep consistent across shots in Magnific Spaces.

The idea is being pitched to a client who may run it for real.`,
  },
  {
    title: 'An ostrich in gold chains on a runway',
    category: 'Experiments',
    body: `Dreamina 1 is a trial-and-error project. No client, no brief, just learning what the tool can and can't do.

Favourite concept so far: an ostrich in gold chains striding down an airport runway at dusk, a plane taking off behind it through heat haze. The camera paths around to a city and macro-zooms into the skyscrapers.

Lesson so far: shorter is better. Ten to fifteen seconds holds together; thirty starts to drift.`,
  },
  {
    title: 'EXIT/ — streetwear for leaving',
    category: 'Brand',
    body: `EXIT/ is an anti-establishment streetwear concept. The visual language borrows from the fire-exit running man: the universal sign for getting out.

Swing tags are designed as fictional banknotes, the brand's own currency. Influence: Virgil Abloh's habit of putting quotation marks around the everyday.

The work covered both sides: Midjourney for the visual world, and real back-and-forth with manufacturers about what can actually be produced.`,
  },
  {
    title: 'Kill the opera',
    category: 'Campaign',
    body: `The brief: accept that opera is dying in Sweden and come up with a way to stop it.

Our group's pitch, which I proposed and pushed for, was "kill the opera". Stop protecting the form as it is and break it open into interactive media formats young people already live in.

The point isn't to dumb it down. It's to get it out of the pigeonhole it's been put in.`,
  },
  {
    title: 'Plenty Labs: the experience of a lifetime',
    category: 'Film',
    body: `An advert for Plenty Labs, made using Plenty Labs.

A man in his mid-forties clicks generate at his desk. Cut to a medieval battle: blue and red armies freeze mid-clash, drop their weapons one by one, leaving trails of bluebells and poppies, and start to dance. They form a giant horse that collapses into petals.

A bell rings. The "professional" at the desk was a fifteen-year-old the whole time, heading out for lunch.

Character sheets are done for both versions of him, six angles each.`,
  },
  {
    title: 'Building this iceberg',
    category: 'Code',
    body: `This site is my individual project for Programming & Methods at Berghs.

The idea: one vertical world. Space above, an iceberg at sea level with my name on it, and the ocean below. The journal you're reading lives inside a submarine.

Under the surface it's a Node server, a PostgreSQL database on Neon, sign-in with hashed passwords, and an AI that writes a short summary of every new post.`,
  },
];
