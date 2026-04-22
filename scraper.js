const fs = require('fs');

const urls = [
  'https://www.iplt20.com/teams/chennai-super-kings/squad/2025',
  'https://www.iplt20.com/teams/delhi-capitals/squad/2025',
  'https://www.iplt20.com/teams/gujarat-titans/squad/2025',
  'https://www.iplt20.com/teams/kolkata-knight-riders/squad/2025',
  'https://www.iplt20.com/teams/lucknow-super-giants/squad/2025',
  'https://www.iplt20.com/teams/mumbai-indians/squad/2025',
  'https://www.iplt20.com/teams/punjab-kings/squad/2025',
  'https://www.iplt20.com/teams/rajasthan-royals/squad/2025',
  'https://www.iplt20.com/teams/royal-challengers-bengaluru/squad/2025',
  'https://www.iplt20.com/teams/sunrisers-hyderabad/squad/2025'
];

async function scrape() {
  const allPlayers = [];
  for (const url of urls) {
    console.log("Fetching", url);
    const res = await fetch(url);
    const html = await res.text();
    
    // Find players
    const blocks = html.split('class="ih-p-img"');
    for (let i=1; i<blocks.length; i++) {
        const block = blocks[i];
        const imgMatch = block.match(/<img[^>]*src="([^"]+)"/);
        const nameMatch = block.match(/<h2[^>]*>([^<]+)<\/h2>/); // wait, name is usually outside ih-p-img
    }
  }
}
scrape();
