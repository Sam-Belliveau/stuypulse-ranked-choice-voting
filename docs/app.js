/*
Copyright (c) 2021 StuyPulse

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// stub for colored output (no-op in Node)
function colored(s, ...args) {
    return s;
  }
  
  // print colored error with tag
  function rcv_print_error(message) {
    const ERROR_HEADER = colored('[ERROR]', /* color: red, attrs: ['bold','blink'] */);
    console.error(`${ERROR_HEADER} ${message.trim()}`);
  }
  
  // class representing a ballot
  class Ballot {
    constructor(name, choices) {
      this.name = name;
      this.choices = choices.slice();
    }
  
    get_pick() {
      return this.has_pick() ? this.choices[0] : '';
    }
  
    has_pick() {
      return this.choices.length > 0;
    }
  
    discard_pick() {
      this.choices.shift();
    }
  }
  
  // class representing a candidate
  class Candidate {
    static MAX_PLACES = 1 << 12;
  
    constructor(name) {
      this.name = name;
      this.count = Array(Candidate.MAX_PLACES).fill(0);
    }
  
    add_count(ballot) {
      ballot.choices.slice(0, Candidate.MAX_PLACES)
        .forEach((choice, rank) => {
          if (choice === this.name) this.count[rank]++;
        });
    }
  
    // compare for sorting (descending)
    static compare(a, b) {
      for (let i = 0; i < Candidate.MAX_PLACES; i++) {
        if (a.count[i] !== b.count[i]) {
          return b.count[i] - a.count[i];
        }
      }
      return 0;
    }
  }
  
  // read and collect ballots from CSV file
  const fs = require('fs');
  function collect_ballots(file_name) {
    let rows;
    try {
      const text = fs.readFileSync(file_name, 'utf8');
      rows = text.trim().split(/\r?\n/).map(line => line.split(','));
    } catch (err) {
      rcv_print_error(`Could not open file "${file_name}"`);
      process.exit(1);
    }
  
    const header = rows[0];
    const lines = rows.slice(1);
  
    // find index of Name column
    const name_idx = header.findIndex(h => h.includes('Name'));
    if (name_idx < 0) {
      rcv_print_error(`CSV File Malformed! [header "Name" not found]`);
      process.exit(1);
    }
  
    // find choice columns (headers containing digits)
    const choices_idx = header
      .map((h, i) => ({ h, i }))
      .filter(x => /^\d+/.test(x.h))
      .map(x => x.i);
    if (choices_idx.length === 0) {
      rcv_print_error('CSV File Malformed! [could not identify choice columns]');
      process.exit(1);
    }
  
    try {
      return lines.map(l => {
        const name = l[name_idx];
        const choices = choices_idx.map(idx => l[idx] || '').filter(c => c);
        return new Ballot(name, choices);
      });
    } catch (e) {
      rcv_print_error('CSV File Malformed! [exception while interpreting ballots]');
      process.exit(1);
    }
  }
  
  // run ranked-choice election
  function run_election(ballots) {
    // padding helper
    function pad_number(num) {
      const s = String(num);
      return ' '.repeat(Math.max(0, 3 - s.length)) + s;
    }
  
    // gather all choices
    let choices = new Set();
    ballots.forEach(b => b.choices.forEach(c => choices.add(c)));
  
    // track max name length
    const name_length = Math.max(...[...choices].map(c => c.length));
    const max_choices = choices.size;
  
    while (choices.size > 0) {
      const candidates = [...choices].map(name => new Candidate(name));
      ballots.forEach(ballot => candidates.forEach(c => c.add_count(ballot)));
      candidates.sort(Candidate.compare);
  
      console.log(colored('\nResults:', /* attrs:['bold'] */));
      candidates.forEach((c, idx) => {
        const place = colored(`${idx + 1}.`, /* attrs:['bold'] */);
        let name = colored(c.name, /* attrs:['underline'] */);
        name += ' '.repeat(Math.max(0, name_length - c.name.length));
        const votes = `${pad_number(c.count[0])} Votes ... [${c.count.slice(0, max_choices).join(', ')}]`;
        console.log(`${place} ${name} | ${votes}`);
      });
  
      // eliminate last
      const last = candidates[candidates.length - 1].name;
      choices.delete(last);
      ballots.forEach(b => {
        while (b.has_pick() && !choices.has(b.get_pick())) {
          b.discard_pick();
        }
      });
    }
  }
  
  // --- main ---
  try {
    console.log('\n\n----= StuyPulse RCV =----');
    const csv_file = process.argv[2];
    if (!csv_file) {
      rcv_print_error('No CSV file provided. Usage: node rcv.js <file.csv>');
      process.exit(1);
    }
    const ballots = collect_ballots(csv_file);
    run_election(ballots);
  } catch (e) {
    console.error('An Error has Occured!');
    console.error('Contact Sam Belliveau.');
    console.error(e);
  }
  