'''
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
'''

from csv import reader as csv_reader
from sys import argv

# from termcolor import colored
def colored(s, *args, **kwargs):
    return s

# print colored error with tag at the beginning
def rcv_print_error(message):
    ERROR_HEADER = colored("[ERROR]", color="red", attrs=["bold", "blink"])
    print(f"{ERROR_HEADER} {message.strip()}")


# class representing a ballot (name and choices)
class Ballot:

    def __init__(self, name, choices):
        self.name = name
        self.choices = choices

    # get top choice
    def get_pick(self):
        if self.has_pick():
            return self.choices[0]
        else:
            return ""

    # check to see if there are any picks left
    def has_pick(self):
        return len(self.choices) > 0

    # move onto the next choice if first choice does not have majority
    def discard_pick(self):
        self.choices = self.choices[1:]


# class representing a candidate and how many votes they have
class Candidate:
    MAX_PLACES = 2**12

    # create a candidate, with 0 counted votes
    def __init__(self, name):
        self.name = name
        self.count = [0] * Candidate.MAX_PLACES

    # count the number of votes a candidate got
    def add_count(self, ballot):
        for rank, name in enumerate(ballot.choices[:Candidate.MAX_PLACES]):
            self.count[rank] += (name == self.name)

    # compare two candidates standings based on their number
    # of 1st votes, then 2nd votes, then 3rd votes etc...
    def __lt__(self, other):
        return self.count < other.count


# read all of the ballots from a CSV file
def collect_ballots(file_name):

    # this function will look to see which index
    # represents which item in the csv list
    def index_in_header(header, key, required=False):
        try:
            return next(i for i, x in enumerate(header) if str(key) in str(x))

        # check to see if this header index is required,
        # if it is, throw an error if it is not found
        # if it is not, just return -1
        except StopIteration:
            if required:
                rcv_print_error(
                    f"CSV File Malformed! [header \"{key}\" not found]")
                quit(-1)
            else:
                return -1

    # open up the CSV with error checking
    try:
        with open(file_name) as csv:
            # read the lines of the CSV
            rows = [row for row in csv_reader(csv)]
            header = rows[0]
            lines = rows[1:]
    except FileNotFoundError:
        rcv_print_error(f"Could not open file \"{file_name}\"")
        quit(-1)

    # get the indexes of the names
    name_idx = index_in_header(header, "Name", required=True)

    # get the indexes of the choices
    choices_finder = (index_in_header(header, str(i))
                      for i in range(1, len(header)))
    choices_idx = [itr for itr in choices_finder if 0 < itr]

    # check to see if the indexes are malformed
    if len(choices_idx) <= 0:
        rcv_print_error(
            "CSV File Malformed! [could not identify choice columbs]")
        quit(-1)

    # create list of ballots
    try:
        return [Ballot(str(l[name_idx]), [str(l[idx]) for idx in choices_idx]) for l in lines]  # remove empty lines
    except Exception:
        rcv_print_error(
            "CSV File Malformed! [exception risen while interpreting ballots]")
        quit(-1)


# run an election based on all of the ballots
# that have been collected from the CSV file
def run_election(ballots):

    # pad number with spaces so 
    # everything lines up correctly
    def pad_number(num):
        o = str(num)
        return " " * max(0, 3 - len(o)) + o
    
    # make a set of all the possible choices
    choices = set()
    for ballot in ballots:
        for choice in ballot.choices:
            choices.add(choice)

    # store name length to make sure every name is lined up
    name_length = max([len(c) for c in choices])
    max_choices = len(choices)

    # keep removing the least voted for
    # person until there are none left
    while 0 < len(choices):
        # make a list of candidates from the choices
        candidates = [Candidate(c) for c in choices]

        # count all of the ballots, and record
        # their votes in the candidate class
        for ballot in ballots:
            for candidate in candidates:
                candidate.add_count(ballot)

        # sort the candidates based on their votes
        candidates = sorted(candidates, reverse=True)

        # print out the results of this round
        print(colored("\nResults:", attrs=["bold"]))
        for p, c in enumerate(candidates):
            place = colored(f"{p + 1}.", attrs=["bold"])
            name = colored(f"{c.name}", attrs=["underline"])
            name += " " * max(0, name_length - len(c.name))
            votes = colored(
                f"{pad_number(c.count[0])} Votes ... {c.count[0:max_choices]}", attrs=[])
            print(f"{place} {name} | {votes}", end="\n")

        # get rid of the least voted for candidate
        last_place = candidates[-1]
        choices.remove(last_place.name)

        # shift the ballots who's first pick was eliminated
        for ballot in ballots:
            while ballot.has_pick() and not ballot.get_pick() in choices:
                ballot.discard_pick()

try:
    print("")
    print("")
    print("----= StuyPulse RCV =----")
    csv_file = argv[1]
    
    # collect the ballots and run the election.
    ballots = collect_ballots(csv_file)
    run_election(ballots)
except Exception as e:
    print("An Error has Occured!")
    print("Contact Sam Belliveau.")
    print(e)
except:
    print("An Error has Occured!")
    print("Contact Sam Belliveau.")