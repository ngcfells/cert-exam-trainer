import type { Tip } from './types';

/** The owner's own tips (spec §5). Each must stay in the list. */
export const OWNER_TIP_IDS = ['no-reading-aloud', 'silly-answers', 'know-acronyms', 'key-word', 'last-sentence-first'] as const;

/** Every tip. General tips have no exam; exam tips name a shipped exam code. Original wording only. */
export const TIPS: readonly Tip[] = [
  {
    id: 'no-reading-aloud',
    group: 'test-room',
    text: 'Saying a question out loud can help it sink in, but do part of your practice in silence. In the test room you have to read every question quietly.',
  },
  {
    id: 'silly-answers',
    group: 'test-room',
    text: 'Some options are there to be silly, so cross them off fast. Keep the laugh to yourself, though: noise draws the proctor, who can end your exam.',
  },
  {
    id: 'know-acronyms',
    group: 'study',
    text: 'Know your acronyms. A question can hinge on one set of letters, and the exam will not spell it out for you.',
  },
  {
    id: 'key-word',
    group: 'test-room',
    text: 'Hunt for the key word, such as BEST, FIRST, MOST, LEAST or NOT. It decides which of several true-sounding options is the answer.',
  },
  {
    id: 'last-sentence-first',
    group: 'test-room',
    text: 'On a long question, read the last sentence first to see what is being asked. Then go back through the story with that goal in mind.',
  },
  {
    id: 'tr-slow-breath',
    group: 'test-room',
    text: 'Take one slow breath before you start the exam. A calm first minute makes the opening questions much easier to read properly.',
  },
  {
    id: 'tr-clock-checkpoints',
    group: 'test-room',
    text: 'Check the clock at set points, such as every quarter of your time, not after every question. Constant glancing wastes seconds and feeds stress.',
  },
  {
    id: 'tr-flag-and-move',
    group: 'test-room',
    text: 'If a question has you stuck, flag it and move on. A fresh look later often shows what you missed, and easier points are waiting ahead.',
  },
  {
    id: 'tr-never-blank',
    group: 'test-room',
    text: 'Check the on-screen instructions about unanswered questions. If guessing costs nothing, never leave one blank; pick your best remaining option.',
  },
  {
    id: 'tr-cover-options',
    group: 'test-room',
    text: 'Cover the answer choices with your hand, read the question, and form your own answer first. Then see which option matches it.',
  },
  {
    id: 'tr-two-left',
    group: 'test-room',
    text: 'Down to two options? Ask what each one would actually cause or fix. The one that solves the stated problem wins.',
  },
  {
    id: 'tr-scenario-clues',
    group: 'test-room',
    text: 'Treat details in a scenario as clues. A mentioned budget, deadline or type of user is usually there to rule some answers out.',
  },
  {
    id: 'tr-pbq-read-first',
    group: 'test-room',
    text: 'When a performance-based question (a hands-on task) appears, read the whole task before touching anything. Know the goal before you click.',
  },
  {
    id: 'tr-pbq-warning',
    group: 'test-room',
    text: 'Performance-based questions (hands-on tasks) come in more than one kind, and some may not let you skip ahead and come back. Read any warning screen before you start one.',
  },
  {
    id: 'tr-pbq-partial',
    group: 'test-room',
    text: 'On a hands-on task, do the parts you are sure of first. Getting moving beats freezing over the one step you cannot recall.',
  },
  {
    id: 'tr-absolute-words',
    group: 'test-room',
    text: 'Words like always, never and only make an option riskier. Real technology has exceptions, so check whether the claim could really hold.',
  },
  {
    id: 'tr-limit-word',
    group: 'test-room',
    text: 'When two answers both look right, reread for the limit in the question, such as cheapest, fastest or least effort. That limit picks the winner.',
  },
  {
    id: 'tr-no-invented-facts',
    group: 'test-room',
    text: 'Answer using only what the question tells you. Do not invent extra facts about the company that would make a different answer better.',
  },
  {
    id: 'tr-nerves-normal',
    group: 'test-room',
    text: 'Nerves are normal and even useful. Name the feeling quietly, drop your shoulders, and go back to the sentence in front of you.',
  },
  {
    id: 'tr-blank-mind',
    group: 'test-room',
    text: 'If your mind goes blank, jot down what you do remember about the topic, if your test provider allows notes. Check the current rules ahead of time.',
  },
  {
    id: 'tr-arrive-early',
    group: 'test-room',
    text: 'Plan to arrive, or log in, early so a delay does not eat into your calm. Check the current check-in rules with your test provider.',
  },
  {
    id: 'tr-id-rules',
    group: 'test-room',
    text: 'Look up the ID rules with your test provider well before exam day, whether you test in a centre or online. Make sure the name on your ID matches your booking.',
  },
  {
    id: 'tr-clock-keeps-running',
    group: 'test-room',
    text: 'If you step away from the screen, assume the clock keeps running unless the current rules say otherwise. Check the break rules with your provider before the day.',
  },
  {
    id: 'tr-eat-and-drink',
    group: 'test-room',
    text: 'Eat something steady and drink some water before you go in. A hungry mind tends to lose focus around the halfway mark.',
  },
  {
    id: 'tr-watch-units',
    group: 'test-room',
    text: 'Watch the units in questions and answers, such as MB versus GB or seconds versus minutes. A wrong unit is a classic trap.',
  },
  {
    id: 'tr-read-every-option',
    group: 'test-room',
    text: 'Read every option before choosing, even when the first one looks perfect. A later one may be more complete.',
  },
  {
    id: 'tr-count-selections',
    group: 'test-room',
    text: 'When a question asks you to choose two or three, count how many you have picked before moving on. Missing one can sink the whole item.',
  },
  {
    id: 'tr-review-screen',
    group: 'test-room',
    text: 'Use the review screen at the end to find flagged and unanswered items. Do those before you recheck questions you felt good about.',
  },
  {
    id: 'tr-time-cushion',
    group: 'test-room',
    text: 'Aim to finish your first pass with a little time left over. That cushion is where you revisit the questions you flagged.',
  },
  {
    id: 'tr-change-with-reason',
    group: 'test-room',
    text: 'Change an answer only when you can name the specific reason, such as a word you misread. A vague uneasy feeling is not a reason.',
  },
  {
    id: 'tr-restate-question',
    group: 'test-room',
    text: 'If the wording confuses you, restate the question as one plain sentence in your head. What is it really asking you to do?',
  },
  {
    id: 'tr-simplest-fix',
    group: 'test-room',
    text: 'Many questions reward the simplest fix that meets the need. Be suspicious of a dramatic option when a small step would do.',
  },
  {
    id: 'tr-facts-before-action',
    group: 'test-room',
    text: 'When a question describes a problem, ask whether you have enough facts to act yet. Gathering information often comes before changing anything.',
  },
  {
    id: 'tr-new-term-context',
    group: 'test-room',
    text: 'If a term is new to you, look at the words around it. The other options often show what family of things it belongs to.',
  },
  {
    id: 'tr-settle-in',
    group: 'test-room',
    text: 'Before the first question, get comfortable with your chair, screen and mouse. A minute of setup saves a session of fidgeting.',
  },
  {
    id: 'tr-report-distractions',
    group: 'test-room',
    text: 'If noise or a distraction bothers you, tell the test staff straight away instead of suffering through it. Ask what they can do.',
  },
  {
    id: 'tr-plain-reading',
    group: 'test-room',
    text: 'Most questions are not trying to trick you. Read plainly first, and hunt for a trap only if the plain reading makes no sense.',
  },
  {
    id: 'tr-impressive-distractor',
    group: 'test-room',
    text: 'Do not treat extra technical detail as proof that an option is right. Some wrong answers are written to sound impressive.',
  },
  {
    id: 'tr-recognition-trap',
    group: 'test-room',
    text: 'Be wary of choosing an answer only because you recognise its terms. Recognition feels like knowing, so check it truly fits this question.',
  },
  {
    id: 'tr-hard-start',
    group: 'test-room',
    text: 'If the first few questions feel hard, keep going. Exams mix easy and hard items, and early difficulty says little about your result.',
  },
  {
    id: 'tr-no-running-score',
    group: 'test-room',
    text: 'You will not see a running score, so do not try to guess how you are doing. Treat every question as a fresh start.',
  },
  {
    id: 'tr-rest-eyes',
    group: 'test-room',
    text: 'Every so often, look away from the screen for a few seconds and relax your eyes. It costs almost no time and keeps you sharp.',
  },
  {
    id: 'tr-loosen-up',
    group: 'test-room',
    text: 'Roll your shoulders and flex your hands now and then while seated. Tension builds quietly over a long session.',
  },
  {
    id: 'tr-per-question-budget',
    group: 'test-room',
    text: 'Set a rough time budget per question and notice when you pass it. Going over once is fine; doing it again and again is how time runs out.',
  },
  {
    id: 'tr-flag-with-lean',
    group: 'test-room',
    text: 'When you flag a question, make a quick mental note of your leading option. You will settle it faster when you come back.',
  },
  {
    id: 'tr-read-agreement',
    group: 'test-room',
    text: 'Read the exam agreement calmly at the start instead of rushing past it. Check the current policies with CompTIA if anything is unclear.',
  },
  {
    id: 'tr-use-tutorial',
    group: 'test-room',
    text: 'If the exam offers a short tutorial, use it to learn the buttons for flagging and moving around. Read the screen to see how it affects your time.',
  },
  {
    id: 'tr-exhibit-first',
    group: 'test-room',
    text: 'When a question comes with a diagram, log or screenshot, study it before the options. The answer usually hides in one detail of it.',
  },
  {
    id: 'tr-odd-line-out',
    group: 'test-room',
    text: 'In a log or output excerpt, hunt for the line that differs from the rest, such as an error, a failure or an odd value.',
  },
  {
    id: 'tr-write-the-steps',
    group: 'test-room',
    text: 'If you must calculate, write the steps down using whatever note method your test provider permits, rather than in your head. Check what is allowed.',
  },
  {
    id: 'tr-sure-maybe-guess',
    group: 'test-room',
    text: 'After each answer, silently rate it sure, maybe or guess. Those ratings tell you where to spend your review time.',
  },
  {
    id: 'tr-vendor-neutral',
    group: 'test-room',
    text: 'CompTIA questions tend to test general principles, not one product\'s quirks. Answer with the widely true idea rather than a brand habit.',
  },
  {
    id: 'tr-after-exam',
    group: 'test-room',
    text: 'After you finish, do not replay every question in your head. Check with your provider and CompTIA how and when results arrive.',
  },
  {
    id: 'tr-online-setup',
    group: 'test-room',
    text: 'If you test online, check the current room, desk and webcam rules with your provider ahead of time, and run any system test early.',
  },
  {
    id: 'tr-bathroom-first',
    group: 'test-room',
    text: 'Use the restroom and settle your comfort before check-in so you rarely need to leave. Ask your provider what the current rules are.',
  },
  {
    id: 'tr-dress-layers',
    group: 'test-room',
    text: 'Dress in layers so you stay comfortable whether the room runs cold or warm. Being distracted by temperature costs more focus than you expect.',
  },
  {
    id: 'tr-dont-disable-protection',
    group: 'test-room',
    text: 'Be cautious of answers that fix a problem by switching off a protection, such as a firewall or a check. Good fixes usually keep safeguards in place.',
  },
  {
    id: 'st-spaced-review',
    group: 'study',
    text: 'Review a topic a day later, then a few days later, then a week later. Spreading it out beats one long session.',
  },
  {
    id: 'st-early-practice-test',
    group: 'study',
    text: 'Take a practice test early, not only at the end. It shows which areas need work while you still have time to fix them.',
  },
  {
    id: 'st-miss-log',
    group: 'study',
    text: 'Keep a log of every question you miss. Write down why you missed it, not just the right answer.',
  },
  {
    id: 'st-miss-categories',
    group: 'study',
    text: 'Sort your misses into groups: did not know it, misread it, or talked yourself out of it. Each group needs a different fix.',
  },
  {
    id: 'st-two-way-cards',
    group: 'study',
    text: 'Make flashcards that work both ways: term to meaning, then meaning to term. Exams can ask in either direction.',
  },
  {
    id: 'st-hands-on-lab',
    group: 'study',
    text: 'Set up a free practice environment and try the things you read about. Doing it yourself sticks far longer than reading about it.',
  },
  {
    id: 'st-final-week-sleep',
    group: 'study',
    text: 'Protect your sleep in the final week. A rested memory recalls far more than a tired one fed on late-night cramming.',
  },
  {
    id: 'st-work-backward',
    group: 'study',
    text: 'Pick an exam date and work backward to a weekly plan. A date on the calendar turns \'someday\' into a schedule.',
  },
  {
    id: 'st-objectives-checklist',
    group: 'study',
    text: 'Download the official exam objectives and tick off each line once you can explain it. They tell you what can be tested.',
  },
  {
    id: 'st-weight-domains',
    group: 'study',
    text: 'Spend your hours in proportion to each domain\'s (topic area\'s) share of the exam. A big domain deserves more days than a small one.',
  },
  {
    id: 'st-weakest-first',
    group: 'study',
    text: 'Start a session with your weakest topic while your mind is fresh. Save the favourites for the end as a reward.',
  },
  {
    id: 'st-teach-it',
    group: 'study',
    text: 'Teach a topic to a friend, a pet or an empty chair. The gaps show up the moment you try to explain.',
  },
  {
    id: 'st-recall-before-reread',
    group: 'study',
    text: 'Close the book and write down what you remember before rereading. Pulling facts out of memory builds more than rereading does.',
  },
  {
    id: 'st-avoid-dumps',
    group: 'study',
    text: 'Avoid brain dumps (leaked lists of real exam questions and answers). They break CompTIA\'s rules, and memorised answers do not build the skill the exam checks.',
  },
  {
    id: 'st-why-wrong',
    group: 'study',
    text: 'After each practice question, explain why every wrong option is wrong. That doubles what you learn from each one.',
  },
  {
    id: 'st-bank-recognition',
    group: 'study',
    text: 'If you start recognising practice questions, switch to new ones. Remembering an answer is not the same as understanding it.',
  },
  {
    id: 'st-mix-topics',
    group: 'study',
    text: 'Mix topics inside a session instead of doing one block for hours. Switching forces your brain to pick the right idea each time.',
  },
  {
    id: 'st-timed-sets',
    group: 'study',
    text: 'Do some practice sets under a timer. Pace is a skill, and you only build it by practising it.',
  },
  {
    id: 'st-full-length-run',
    group: 'study',
    text: 'Take at least one full-length practice run in a single sitting. It shows how your focus holds up over the whole session.',
  },
  {
    id: 'st-draw-from-memory',
    group: 'study',
    text: 'Draw diagrams of processes and networks from memory. A picture you made yourself is easier to recall than one you only looked at.',
  },
  {
    id: 'st-silly-stories',
    group: 'study',
    text: 'Invent silly stories or phrases for lists you must remember in order. The sillier the image, the stickier it gets.',
  },
  {
    id: 'st-compare-table',
    group: 'study',
    text: 'Build a table comparing look-alike concepts side by side. Exams love asking you to tell near neighbours apart.',
  },
  {
    id: 'st-real-life-hooks',
    group: 'study',
    text: 'Tie each concept to something you have seen, like your home Wi-Fi or an app login. Real examples give abstract ideas something to hold on to.',
  },
  {
    id: 'st-term-sheet',
    group: 'study',
    text: 'Keep a running page of new terms with one-line meanings. Skim it in spare minutes, such as while waiting in a queue.',
  },
  {
    id: 'st-best-hour',
    group: 'study',
    text: 'Study at the time of day when you focus best, and put your phone on silent. Guarding that hour is worth more than extra tired ones.',
  },
  {
    id: 'st-focus-blocks',
    group: 'study',
    text: 'Work in focused blocks with short breaks, such as twenty-five minutes on and five off. The breaks give the material time to settle.',
  },
  {
    id: 'st-walk-first',
    group: 'study',
    text: 'Take a short walk before you study. Movement is a cheap boost for a tired head.',
  },
  {
    id: 'st-second-explainer',
    group: 'study',
    text: 'Look at more than one explanation of a hard topic. A second teacher\'s angle can make it finally click.',
  },
  {
    id: 'st-check-official-page',
    group: 'study',
    text: 'Read the official exam page for current details such as time, question counts and rules. Details can change, so trust it over hearsay.',
  },
  {
    id: 'st-weekly-look-back',
    group: 'study',
    text: 'Spend a few minutes each week looking back at what you studied. Rereading your miss log is the best use of that time.',
  },
  {
    id: 'st-day-before',
    group: 'study',
    text: 'The day before the exam, skim your notes lightly and stop. New material that late rarely sticks and mostly adds worry.',
  },
  {
    id: 'st-study-group',
    group: 'study',
    text: 'Join a study group or online community to swap explanations. Share ideas only, never actual exam questions.',
  },
  {
    id: 'st-small-wins',
    group: 'study',
    text: 'Mark small wins, like finishing a domain. Progress you can see keeps motivation up over weeks.',
  },
  {
    id: 'st-tidy-desk',
    group: 'study',
    text: 'Study at a tidy desk with one task in view. Fewer open tabs mean fewer excuses to drift.',
  },
  {
    id: 'st-notes-as-questions',
    group: 'study',
    text: 'Write notes as questions with the answers beneath, rather than long paragraphs. Your notes then double as a self-test.',
  },
  {
    id: 'st-name-the-topic',
    group: 'study',
    text: 'Practise naming what a scenario is about in a few words, like \'slow network\' or \'bad data\'. Naming the topic narrows your search.',
  },
  {
    id: 'st-sanity-check-math',
    group: 'study',
    text: 'After any calculation, ask whether the result makes sense. A negative file size or a percentage far over a hundred often signals a slip.',
  },
  {
    id: 'st-type-from-memory',
    group: 'study',
    text: 'Type technical commands and syntax from memory in practice, rather than copying them. Muscle memory helps when you cannot look anything up.',
  },
  {
    id: 'st-spare-week',
    group: 'study',
    text: 'Leave a spare week in your plan for slips. Life interrupts, and a plan without slack breaks.',
  },
  {
    id: 'st-retake-plan',
    group: 'study',
    text: 'Decide in advance how you would respond to a miss: study your score report and fix the weak areas. Check the current retake rules with CompTIA.',
  },
  {
    id: 'st-chart-scores',
    group: 'study',
    text: 'Chart your practice scores over time. A trend tells you more than any single bad day.',
  },
  {
    id: 'st-stop-when-foggy',
    group: 'study',
    text: 'Stopping when you are too tired to focus is fine. A rested hour later beats a foggy hour now.',
  },
  {
    id: 'st-ask-why',
    group: 'study',
    text: 'Ask why a rule exists, not only what it is. Reasons are easier to remember and help you handle situations you have not seen.',
  },
  {
    id: 'st-write-exam-questions',
    group: 'study',
    text: 'Each week, write three questions an examiner might ask about that week\'s topic, and answer them a few days later. It trains you to think like the test.',
  },
  {
    id: 'st-readiness-pattern',
    group: 'study',
    text: 'Do not wait to feel fully ready. Look for a steady pattern of good practice results; readiness is a pattern, not a feeling.',
  },
  {
    id: 'st-term-families',
    group: 'study',
    text: 'Group terms into families, like storage, networking or people and policy. Filing a new fact into a family makes it easier to find later.',
  },
  {
    id: 'st-warm-up-questions',
    group: 'study',
    text: 'Begin each session by answering five questions from yesterday\'s material. A quick warm-up pulls old knowledge forward.',
  },
  {
    id: 'st-handwrite-some',
    group: 'study',
    text: 'Take notes by hand now and then. Writing slows you down just enough to decide what really matters.',
  },
  {
    id: 'st-audio-then-recall',
    group: 'study',
    text: 'Use commute or chore time for audio lessons, then quiz yourself from memory at your desk. Listening alone is a light touch.',
  },
  {
    id: 'st-one-question-per-topic',
    group: 'study',
    text: 'Pair each study topic with one practice question on the same day. It shows whether you learned it or only read it.',
  },
  {
    id: 'st-one-goal-session',
    group: 'study',
    text: 'Give each session one clear goal, such as finishing one objective. \'Study networking\' is vague; one objective is doable.',
  },
  {
    id: 'st-keep-perspective',
    group: 'study',
    text: 'Keep perspective: it is one test on one day, and it measures what you know now. Fear raises the stakes without helping you think.',
  },
  {
    id: 'da-hand-stats',
    group: 'study',
    exam: 'DA0-002',
    text: 'Practise mean, median and mode by hand on short lists. Sort the numbers first for the median, and with an even count, average the middle two.',
  },
  {
    id: 'da-percent-change',
    group: 'study',
    exam: 'DA0-002',
    text: 'For percent change, subtract old from new, divide by the old value, then multiply by one hundred. Dividing by the new value is a common slip.',
  },
  {
    id: 'da-chart-choice',
    group: 'test-room',
    exam: 'DA0-002',
    text: 'Match chart to question: lines for change over time, bars to compare groups, scatter for a link between two numbers. Name the question first.',
  },
  {
    id: 'da-join-sketch',
    group: 'study',
    exam: 'DA0-002',
    text: 'Sketch two tiny tables and draw lines between matching rows to understand joins. Then ask which rows survive: matches only, or all from one side.',
  },
  {
    id: 'da-cleaning-effects',
    group: 'study',
    exam: 'DA0-002',
    text: 'When cleaning data, look for duplicates, blanks, odd spellings and impossible values. Ask what each problem would do to an average or a count.',
  },
  {
    id: 'da-table-task',
    group: 'test-room',
    exam: 'DA0-002',
    text: 'If you get a hands-on task with a data table, check the headers and a few rows before changing anything. Make one change at a time.',
  },
  {
    id: 'da-governance-questions',
    group: 'study',
    exam: 'DA0-002',
    text: 'For governance questions, think who owns the data, who may see it, how long it is kept and how it is protected. Match the control to how sensitive the data is.',
  },
  {
    id: 'cy-biggest-domain',
    group: 'study',
    exam: 'CY0-001',
    text: 'Securing AI Systems is the largest topic area (domain) of this exam, so give it the biggest share of your study time. Practise it with scenarios, not just definitions.',
  },
  {
    id: 'cy-prompt-injection',
    group: 'study',
    exam: 'CY0-001',
    text: 'Prompt injection is crafted text that tricks an AI into ignoring its instructions. Learn the difference between a user typing it and an attack hidden in a document the AI reads.',
  },
  {
    id: 'cy-data-poisoning',
    group: 'study',
    exam: 'CY0-001',
    text: 'Know that data poisoning slips bad examples into training data so the model learns the wrong thing. It happens before use, while prompt injection (sneaky instructions in the input) happens during use.',
  },
  {
    id: 'cy-model-theft',
    group: 'study',
    exam: 'CY0-001',
    text: 'Model theft means copying a model\'s behaviour or files, for example with huge numbers of queries. Pair it with defences like rate limits (caps on requests per user), access control and monitoring.',
  },
  {
    id: 'cy-guardrails-layers',
    group: 'test-room',
    exam: 'CY0-001',
    text: 'Guardrails are checks around an AI, such as input filters, output filters and limits on what it can do. To reduce harm, favour layered controls over one single fix.',
  },
  {
    id: 'cy-both-sides',
    group: 'test-room',
    exam: 'CY0-001',
    text: 'AI helps both sides: defenders use it to sort alerts, attackers use it for convincing phishing and fake voices. Check which side the question asks about.',
  },
  {
    id: 'cy-governance-frames',
    group: 'study',
    exam: 'CY0-001',
    text: 'For governance, think policy, accountability, risk assessment, transparency and legal compliance. Learn what common AI frameworks are for and who answers when the AI errs.',
  },
  {
    id: 'at-read-scripts',
    group: 'study',
    exam: 'AT0-001',
    text: 'Practise reading short scripts line by line and saying what each does. Trace variable values through loops and if-statements by hand.',
  },
  {
    id: 'at-yaml-json-slips',
    group: 'study',
    exam: 'AT0-001',
    text: 'Learn to spot YAML and JSON mistakes: YAML cares about indentation, while JSON needs matching braces and quoted keys. Check punctuation before logic.',
  },
  {
    id: 'at-git-cycle',
    group: 'study',
    exam: 'AT0-001',
    text: 'Know the Git cycle: stage, commit, push, branch, merge. Be clear about what exists only on your machine and what has been shared with the remote copy.',
  },
  {
    id: 'at-pipeline-picture',
    group: 'study',
    exam: 'AT0-001',
    text: 'Picture a pipeline as an assembly line: build, test, then deliver. When a stage fails, ask what ran before it and what gets skipped as a result.',
  },
  {
    id: 'at-iac-benefits',
    group: 'study',
    exam: 'AT0-001',
    text: 'Infrastructure as code means describing servers and settings in files instead of clicking in consoles. Remember why: repeatable, reviewable and tracked in version control.',
  },
  {
    id: 'at-typed-commands',
    group: 'test-room',
    exam: 'AT0-001',
    text: 'If a task asks you to type a command, reread the task and check your spelling, spacing and flags (the options after a command) before you submit. Exact syntax matters.',
  },
  {
    id: 'at-pace-and-code',
    group: 'test-room',
    exam: 'AT0-001',
    text: 'You have {minutes} minutes for up to {maxQuestions} questions, and a pass needs {passingScore}. Coding is the biggest domain, so make reading code a routine, not a struggle.',
  },
];
