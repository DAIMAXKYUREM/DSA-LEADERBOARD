import fs from 'fs';
fetch('https://cses.fi/problemset/user/48238/').then(r => r.text()).then(t => {
  fs.writeFileSync('cses_prob_user.html', t);
});
