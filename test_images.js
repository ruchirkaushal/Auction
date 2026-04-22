const https = require('https');

const urls = [
  // Ruturaj
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/5443.png',
  'https://documents.iplt20.com/ipl/IPLHeadshot2024/5443.png',
  // David Warner
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/170.png',
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2024/212.png',
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/playerheadshot/ipl/1000/212.png',
  'https://documents.iplt20.com/ipl/IPLHeadshot2025/170.png',
  'https://documents.iplt20.com/ipl/IPLHeadshot2025/212.png',
  // Prithvi Shaw
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/playerheadshot/ipl/1000/1126.png',
  // Jos Buttler
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/playerheadshot/ipl/1000/509.png',
  // Glenn Maxwell
  'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/playerheadshot/ipl/1000/282.png',
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode, length: res.headers['content-length'] });
    }).on('error', () => resolve({ url, status: 'error' }));
  });
}

async function main() {
  for (const url of urls) {
    const res = await checkUrl(url);
    console.log(res);
  }
}
main();
