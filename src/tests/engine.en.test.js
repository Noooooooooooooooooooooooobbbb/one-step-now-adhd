const T = require("../engine.en.js");
let pass = 0, fail = 0; const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }

// 1) Expected template for common tasks
const expect = {
  "clean the kitchen":"dishes","do the dishes":"dishes","tidy the kitchen":"dishes","load the dishwasher":"dishes",
  "do laundry":"laundry","wash my clothes":"laundry","fold the clothes":"laundry",
  "clean my room":"room","tidy the house":"room","declutter my desk":"room","organise the garage":"room",
  "clean the bathroom":"bathroom","scrub the toilet":"bathroom","vacuum the living room":"vacuum","mop the floor":"vacuum",
  "answer emails":"email","reply to emails":"email","clear my inbox":"email","email my boss":"email",
  "reply to messages":"message","text Sam back":"verb:text","call mum":"verb:call","call the dentist":"verb:call",
  "book a dentist appointment":"call","make a doctor appointment":"call","book a flight to Rome":"booking","reserve a table":"booking",
  "write my essay":"essay","write a report":"essay","finish my dissertation":"essay","write a cover letter":"essay",
  "do my homework":"homework","finish the maths assignment":"homework",
  "study for my exam":"study","revise biology":"study","study for my driving test":"study","learn spanish":"study",
  "read a book":"read","read chapter 3":"read","do my taxes":"taxes","file my tax return":"taxes",
  "pay bills":"bills","pay the rent":"bills","sort out my budget":"bills",
  "renew my passport":"paperwork","fill in the insurance claim form":"paperwork",
  "apply for a job":"job","update my CV":"job","prepare for an interview":"job",
  "buy groceries":"groceries","go food shopping":"groceries","buy milk":"groceries","buy milk, eggs and bread":"groceries",
  "cook dinner":"cook","bake a cake":"cook","make lunch":"cook",
  "go for a run":"exercise","work out":"exercise","go to the gym":"exercise","do yoga":"exercise",
  "pack for my trip":"pack","move house":"pack","pack my suitcase":"pack",
  "make a presentation":"presentation","prepare slides":"presentation",
  "mow the lawn":"garden","weed the garden":"garden","water the plants":"garden",
  "get the car serviced":"car","oil change":"car",
  "get ready for work":"getready","take a shower":"shower","go to bed":"getready",
  "fix the leaky sink":"fix","assemble the bookshelf":"fix","replace the light bulb":"fix",
  "plan a birthday party":"plan","organize the wedding":"plan",
  "run errands":"errands","do chores":"errands",
  "buy a gift for dad":"verb:buy","return the parcel":"verb:return","cancel my gym membership":"verb:cancel",
  "clean the car":"verb:clean","write a poem":"poem",
  "write a song":"song","write lyrics for my song":"song","compose music":"compose","compose a piece for piano":"compose",
  "make a beat in FL Studio":"compose","write a new track":"compose","practise guitar":"instrument","practice piano":"instrument",
  "play the violin":"instrument","practise music":"instrument","sing scales":"instrument","learn the drums":"instrument",
  "write a short story":"fiction","work on my novel":"fiction","write chapter 2 of my story":"fiction","write a screenplay":"fiction",
  "read a short story":"read","read a novel":"read","write a haiku":"poem","write a blog post":"nonfiction","write my memoir":"nonfiction",
  "write a non-fiction article":"nonfiction","write a book":"bookwrite","draw a portrait":"art","paint a picture":"art",
  "do some sketching":"art","paint the bedroom":"fix","paint the fence":"fix","make a YouTube video":"video",
  "record a podcast episode":"video","edit my video":"video","knit a scarf":"craft","sew a button":"craft","write an essay":"essay",
  "zorp the flibber":"generic","asdfgh":"generic","think about life":"generic",
  "I need to do my taxes!":"taxes","Gotta clean my room.":"room","todo: pay rent":"bills","Need to call mum":"verb:call"
};
for (const [input, want] of Object.entries(expect)) {
  const r = T.breakDown(input);
  const got = r.parts.map(p => p.source).join("+");
  ok(got === want, `template: "${input}" -> ${got}, want ${want}`);
}

// 2) Splitting
const splits = {
  "clean my room and call mum, then pay rent": 3,
  "do the laundry and the dishes": 2,
  "buy salt and pepper": 1,
  "buy milk, eggs": 1,
  "clean kitchen, laundry": 2,
  "write essay; study for exam; go for a run; cook dinner; pay bills": 4, // capped at 4
  "rock and roll practice": 1,
  "cook dinner and then wash up": 2
};
for (const [input, n] of Object.entries(splits)) {
  const got = T.breakDown(input).parts.length;
  ok(got === n, `split: "${input}" -> ${got} parts, want ${n}`);
}

// 3) Invariants on a large set of inputs, including hostile ones
const weird = ["", "   ", null, undefined, 42, "!!!", "???", "and", "then", ",,,", "and and and", "a".repeat(5000),
  "<script>alert(1)</script>", "<img src=x onerror=alert(1)> clean room", "清理房间", "🧹 clean 🧽", "CLEAN MY ROOM",
  "clean\nmy\troom", "{obj} {task}", "$& $1 replace me", "my my my", "I I I", "fix", "call", "write", "buy", "the", "to",
  "do it", "start", "finish the thing for the meeting tomorrow about the quarterly numbers and the budget review"];
const all = Object.keys(expect).concat(Object.keys(splits), weird);
for (const input of all) {
  let r;
  try { r = T.breakDown(input); } catch (e) { ok(false, `threw on ${JSON.stringify(input)}: ${e}`); continue; }
  const label = JSON.stringify(String(input).slice(0, 40));
  ok(Array.isArray(r.steps), `steps array for ${label}`);
  const meaningful = /[a-z0-9À-￿]/i.test(String(input ?? "").replace(/\b(and|then|the|to|a)\b/gi, ""));
  if (meaningful) {
    ok(r.steps.length >= 3 && r.steps.length <= 12, `3-12 steps for ${label}, got ${r.steps.length}`);
  } else {
    ok(r.steps.length === 0 || r.steps.length >= 3, `empty input gives no steps or valid steps for ${label}: ${r.steps.length}`);
  }
  for (const st of r.steps) {
    ok(typeof st === "string" && st.trim().length > 0, `non-empty step for ${label}`);
    ok(!(/\{(obj|task|verb)\}/.test(st) && !/[{}]/.test(String(input))) && !/undefined|null|NaN/.test(st), `no leftover placeholder for ${label}: ${st}`);
    ok(st.length <= 120, `step <=120 chars for ${label}: ${st.length}`);
    ok(st[0] === st[0].toUpperCase(), `capitalised for ${label}: ${st}`);
    ok(!/\s{2,}/.test(st), `no double spaces for ${label}: ${st}`);
    ok(!/\bmy\b|\bI\b/.test(st.replace(/^[^:]*:/, "")) || /my my|I I/.test(String(input)), `second person for ${label}: ${st}`);
  }
  const lower = r.steps.map(x => x.toLowerCase());
  ok(new Set(lower).size === lower.length, `no duplicate steps for ${label}`);
}

// 4) Specific wording checks
ok(T.breakDown("text Sam back").steps[0] === "Open the conversation with Sam", "strips trailing 'back'");
ok(T.breakDown("buy a gift for my dad").steps[0] === "Check whether you already have a gift for your dad", "pronoun swap my->your");
ok(T.breakDown("<b>x</b>").steps.every(s => typeof s === "string"), "html stays plain text (UI uses textContent)");
ok(T.breakDown("$& clean").steps.join("|").indexOf("undefined") < 0, "replacement patterns safe");
ok(T.breakDown("I need to do my taxes!").parts[0].task === "do your taxes", "lead-in stripped and second person");

// 5) Determinism and speed
const a1 = JSON.stringify(T.breakDown("clean my room and call mum")), a2 = JSON.stringify(T.breakDown("clean my room and call mum"));
ok(a1 === a2, "deterministic");
const t0 = Date.now(); for (let i = 0; i < 5000; i++) T.breakDown("clean my room and call mum, then pay rent"); const dt = Date.now() - t0;
ok(dt < 2000, `5000 runs in ${dt}ms`);

console.log(`passed ${pass}, failed ${fail}`);
fails.forEach(f => console.log("FAIL", f));
process.exit(fail ? 1 : 0);
