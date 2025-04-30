/*
Copyright (c) 2021 StuyPulse
Permission is hereby granted...
(the same MIT license text)
*/

class Ballot {
  constructor(name, choices) {
    this.name = name;
    this.choices = choices.slice();
  }
  getPick() {
    return this.hasPick() ? this.choices[0] : '';
  }
  hasPick() {
    return this.choices.length > 0;
  }
  discardPick() {
    this.choices.shift();
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
  const nameIdx = header.findIndex(h => h.includes('Name'));
  if (nameIdx < 0) throw new Error(`Missing "Name" column`);

  // find all choice columns (headers containing "1", "2", etc.)
  const choiceIdx =
      header.map((h, i) => ({h, i})).filter(x => /\d+/.test(x.h)).map(x => x.i);
  if (choiceIdx.length === 0) {
    throw new Error('No choice columns found');
  }

  return rows.map(r => {
    const name = r[nameIdx];
    const choices = choiceIdx.map(i => r[i]).filter(c => c);
    return new Ballot(name, choices);
  });
}

function runElection(ballots) {
  let choices = new Set();
  ballots.forEach(b => b.choices.forEach(c => choices.add(c)));

  const totalChoices = choices.size;
  const resultsLines = [];

  do {
    // init candidates
    const candidates = [...choices].map(name => new Candidate(name));

    // tally
    ballots.forEach(b => {
      candidates.forEach(c => c.addCount(b));
    });

    // sort
    candidates.sort(Candidate.compare);

    // get longest name length
    const longestName = candidates.reduce((max, c) => {
      return Math.max(max, c.name.length);
    }, 0);

    // print round
    resultsLines.push('\nResults:');
    candidates.forEach((c, idx) => {
      const rank = (idx + 1).toString().padStart(3, ' ');
      const name = c.name.padEnd(longestName);
      const voteCounts = c.count.slice(0, totalChoices)
                             .map(v => v.toString().padStart(3, ' '))
                             .join(' ');
      resultsLines.push(`${rank}. ${name} | ${voteCounts}`);
    });

    // check for winner
    if (candidates.length === 1) {
      resultsLines.push('');
      resultsLines.push(`Winner: ${candidates[0].name}`);
      break;
    }

    // determine if there is a tie
    const firstCandidate = candidates[0];
    const lastCandidate = candidates[candidates.length - 1];
    if (Candidate.compare(firstCandidate, lastCandidate) === 0) {
      resultsLines.push('');
      resultsLines.push('TIE!');
      break;
    }

    // eliminate last
    const loser = candidates[candidates.length - 1].name;
    choices.delete(loser);

    // discard picks for ballots that pointed to loser
    ballots.forEach(b => {
      while (b.hasPick() && !choices.has(b.getPick())) {
        b.discardPick();
      }
    });
  } while (choices.size > 0)

  return resultsLines.join('\n');
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