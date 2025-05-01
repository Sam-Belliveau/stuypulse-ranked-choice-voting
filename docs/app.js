/*
Copyright (c) 2021 StuyPulse
Permission is hereby granted...
(the same MIT license text)
*/

class Ballot {
  constructor(choices) {
    this.choices = choices.slice();
  }

  filter(remaining) {
    this.choices = this.choices.filter(c => remaining.has(c));
  }
}

class Candidate {
  static MAX_PLACES = 1 << 12;

  constructor(name) {
    this.name = name;
    this.count = Array(Candidate.MAX_PLACES).fill(0);
  }

  addCount(ballot) {
    ballot.choices.slice(0, Candidate.MAX_PLACES).forEach((choice, rank) => {
      if (choice === this.name) this.count[rank]++;
    });
  }

  // sort descending by counts array
  static compare(a, b) {
    for (let i = 0; i < Candidate.MAX_PLACES; i++) {
      if (a.count[i] !== b.count[i]) {
        return b.count[i] - a.count[i];
      }
    }
    return 0;
  }
}

function parseBallots(data) {
  const [header, ...rows] = data;

  const choices = header
                      .map((h, i) => {
                        const digits = h.replace(/\D/g, '');
                        return {index: i, num: parseInt(digits, 10)};
                      })
                      .filter(col => 0 < col.num)
                      .sort((a, b) => a.num - b.num)
                      .map(col => col.index);

  if (choices.length === 0) {
    throw new Error('No choice columns found');
  }

  return rows.map(row => {
    return new Ballot(choices.map(i => row[i]));
  });
}

function runElection(ballots) {
  const output = [];

  let choices = new Set();
  ballots.forEach(b => b.choices.forEach(c => choices.add(c)));

  const totalChoices = choices.size;
  const longestName = [...choices].reduce((max, c) => {
    return Math.max(max, c.length);
  }, 0);

  while (choices.size > 0) {
    // init candidates
    const candidates = [...choices].map(name => new Candidate(name));

    // tally
    ballots.forEach(b => {
      candidates.forEach(c => c.addCount(b));
    });

    // sort
    candidates.sort(Candidate.compare);

    // print round
    output.push('\nResults:');
    candidates.forEach((c, idx) => {
      const rank = (idx + 1).toString().padStart(3, ' ');
      const name = c.name.padEnd(longestName);
      const voteCounts = c.count.slice(0, totalChoices)
                             .map(v => v.toString().padStart(3, ' '))
                             .join(' ');
      output.push(`${rank}. ${name} | ${voteCounts}`);
    });

    // check for winner
    if (candidates.length === 1) {
      output.push('');
      output.push(`Winner: ${candidates[0].name}`);
      break;
    }

    // determine if there is a tie
    const firstCandidate = candidates[0];
    const lastCandidate = candidates[candidates.length - 1];
    if (Candidate.compare(firstCandidate, lastCandidate) === 0) {
      output.push('');
      output.push('TIE!');
      break;
    }

    // eliminate last
    const loser = candidates[candidates.length - 1].name;
    choices.delete(loser);

    // discard picks for ballots that pointed to loser
    ballots.forEach(b => {
      b.filter(choices);
    });
  }

  return output.join('\n');
}

function run() {
  const input = document.getElementById('csvFileInput');
  const file = input.files[0];
  const out = document.getElementById('results');
  out.textContent = '';

  if (!file) {
    out.innerHTML = `<div class="error">Please select a CSV file first.</div>`;
    return;
  }

  Papa.parse(file, {
    complete: (res) => {
      try {
        const ballots = parseBallots(res.data);
        const txt = runElection(ballots);
        out.textContent = txt;
      } catch (e) {
        out.innerHTML = `<div class="error">${e.message}</div>`;
      }
    },
    error: (err) => {
      out.innerHTML =
          `<div class="error">CSV parse error: ${err.message}</div>`;
    }
  });
}

// --- UI wiring ---
document.getElementById('runButton').addEventListener('click', (e) => {
  run();
});

document.getElementById('csvFileInput').addEventListener('change', () => {
  run();
});