/* Task splitter: turns a typed task into tiny, concrete steps.
   Runs fully offline: keyword templates + verb-based fallbacks. No network, no AI service. */
(function (root) {
  "use strict";

  // Verbs we recognise at the start of a task (used to find the object and to split "X and Y").
  var VERBS = ("clean tidy wash vacuum hoover mop dust sweep organise organize declutter sort fold iron " +
    "write draft finish start edit revise proofread type " +
    "call phone ring text message email reply respond answer contact " +
    "buy shop get order pick grab return " +
    "read study revise learn review practice practise memorise memorize " +
    "fix repair mend replace install assemble build " +
    "make cook bake prepare prep " +
    "plan organise schedule book arrange " +
    "apply submit send fill complete " +
    "pay file " +
    "pack unpack move " +
    "exercise run walk book reserve play sing compose draw paint sketch film record knit crochet sew practice go do take put empty load unload change water feed mow weed rake cancel renew update back").split(" ");
  var VERB_SET = {};
  VERBS.forEach(function (v) { VERB_SET[v] = true; });

  // Specific situations. First matching template with the highest score wins.
  // {obj} = the task without its leading verb, {task} = the whole task (both in second person).
  var TEMPLATES = [
    { id: "dishes", kw: /\b(dish(es)?|washing[- ]up|dishwasher|kitchen|sink)\b/i, steps: [
      "Put on a song or podcast you like",
      "Throw away any rubbish on the counters",
      "Scrape leftover food into the bin",
      "Load or wash the plates first",
      "Then the cups and glasses",
      "Then the cutlery",
      "Leave pans to soak with hot soapy water",
      "Wipe the counter next to the sink",
      "Scrub the soaked pans",
      "Empty the bin if it's full"] },
    { id: "laundry", kw: /\b(laundry|washing machine|clothes|dryer|ironing|load of washing)\b/i, steps: [
      "Grab a basket or bag",
      "Collect clothes from the floor and the hamper",
      "Sort into darks and lights",
      "Put one load in the machine with detergent",
      "Press start and set a phone timer for when it ends",
      "When it beeps, move the clothes to dry",
      "Once dry, fold or hang just the tops first",
      "Then the rest",
      "Put everything away in drawers or the wardrobe"] },
    { id: "room", kw: /\b(room|bedroom|house|flat|apartment|office|desk|garage|closet|wardrobe|cupboard|mess|declutter|tidy)\b/i, steps: [
      "Set a 10-minute timer",
      "Grab a bin bag and a basket",
      "Pick up anything that is rubbish and bin it",
      "Put dirty clothes or dishes in the basket",
      "Clear one surface completely",
      "Put things on that surface back where they live",
      "Pick one more small area and clear it",
      "Take the basket where it belongs",
      "Take out the bin bag",
      "Stop and look at what you did"] },
    { id: "bathroom", kw: /\b(bathroom|toilet|shower|bath ?tub|loo)\b/i, steps: [
      "Put on gloves and grab a cleaning spray and cloth",
      "Clear bottles and stuff off the surfaces",
      "Spray the sink, toilet and shower",
      "Wipe the sink and taps",
      "Scrub inside the toilet, then wipe the outside",
      "Rinse the shower or bath",
      "Put the bottles back",
      "Swap in a clean towel"] },
    { id: "vacuum", kw: /\b(vacuum|hoover|mop|sweep|floors?)\b/i, steps: [
      "Get the vacuum, mop or broom out",
      "Pick up things lying on the floor",
      "Start in the far corner of one room",
      "Work toward the door",
      "Do the next room the same way",
      "Empty the vacuum or rinse the mop",
      "Put everything away"] },
    { id: "email", kw: /\b(e-?mails?|inbox)\b/i, steps: [
      "Open your inbox and nothing else",
      "Set a 15-minute timer",
      "Delete or archive anything you don't need",
      "Star the emails that need a reply",
      "Reply to the quickest one first, in two or three sentences",
      "Reply to the next starred one",
      "Note any that need more time",
      "Close the inbox when the timer rings"] },
    { id: "message", kw: /\b(messages?|reply to|respond to|get back to|dms?|whatsapps?|texts)\b/i, steps: [
      "Open the conversation",
      "Read the last message once",
      "Type a short first draft, it doesn't need to be perfect",
      "Read it back once",
      "Press send",
      "Close the app"] },
    { id: "call", kw: /\b(appointment|dentist|doctor|gp|vet|hairdresser|haircut|optician)\b/i, steps: [
      "Find the phone number or booking page",
      "Write down what you need to say in one line",
      "Have your calendar open for dates",
      "Get any details they'll ask for (ID, account or reference number)",
      "Dial or start the booking",
      "Say your one line",
      "Write down the date, time or outcome",
      "Add it to your calendar"] },
    { id: "essay", kw: /\b(essay|paper|report|thesis|dissertation|cover letter|speech)\b/i, steps: [
      "Open a blank document and give it a title",
      "Write the question or brief at the top",
      "Brain-dump every idea as bullet points for 5 minutes",
      "Group the bullets into 3 to 5 sections",
      "Write one rough sentence for each section",
      "Expand the easiest section first",
      "Fill in the next section",
      "Write a short intro and ending",
      "Read it through once and fix what jumps out",
      "Save and submit or send"] },
    { id: "homework", kw: /\b(homework|assignment|worksheet|coursework|problem set|project for (school|class))\b/i, steps: [
      "Find out exactly what's due and when",
      "Get the book, laptop or sheet out on your desk",
      "Read the instructions once",
      "Do the first question or the easiest part",
      "Take a 2-minute break",
      "Do the next part",
      "Mark anything you're stuck on and move on",
      "Check your answers",
      "Hand it in or put it in your bag"] },
    { id: "study", kw: /\b(study|studying|revise|revision|exams?|quiz|flashcards?|learn|(maths?|science|history|driving|spelling|chemistry|biology|physics|french|spanish) test|test (for|on))\b/i, steps: [
      "Pick one topic for this session",
      "Put your phone in another room",
      "Set a 20-minute timer",
      "Skim your notes on that topic",
      "Close the notes and write down what you remember",
      "Check what you missed",
      "Make 5 flashcards or practice questions",
      "Take a 5-minute break",
      "Test yourself on the cards"] },
    { id: "read", kw: /\b(read|reading|book|pages)\b/i, steps: [
      "Pick up the book and put your phone face down",
      "Find where you stopped",
      "Read just one page",
      "Keep going for 10 minutes",
      "Mark your place",
      "Jot one line about what you read"] },
    { id: "song", kw: /\b(songs?|lyrics|songwriting|verse|chorus)\b/i, steps: [
      "Open a notes app or grab a notebook",
      "Write one line about what the song is about",
      "Hum or play a few chords and record a voice memo",
      "Pick the bit you like best as the chorus idea",
      "Write rough lyrics for the chorus, rhymes optional",
      "Write a first verse, it can be messy",
      "Record a rough run-through on your phone",
      "Listen back once and note one thing to change",
      "Save it with a title, even a temporary one"] },
    { id: "compose", kw: /\b(compose|composing|composition|melody|beats?|tracks?|music|score|symphony|piece|chord progression|daw|ableton|garageband|fl studio)\b/i, steps: [
      "Open your instrument or music app and start a blank project",
      "Set a tempo and key, any will do",
      "Record or write a 4-bar idea",
      "Loop it and add one more layer (bass, chords or rhythm)",
      "Make a variation for a second section",
      "Arrange the sections in order",
      "Export or record a rough version",
      "Listen back once and write down one thing to fix",
      "Save the project with today's date"] },
    { id: "instrument", kw: /\b(guitar|piano|violin|viola|cello|drums?|ukulele|uke|bass|flute|clarinet|saxophone|sax|trumpet|trombone|harp|recorder|instrument|singing|sing|vocals?|scales)\b/i, steps: [
      "Get the instrument out and put it where you'll play",
      "Tune up",
      "Set a 15-minute timer",
      "Warm up for 2 minutes (scales, chords or a vocal warm-up)",
      "Play something you already know and enjoy",
      "Pick one tricky bar or technique to work on",
      "Play it slowly 5 times",
      "Speed it up a little",
      "Finish by playing something fun",
      "Leave the instrument somewhere you'll see it"] },
    { id: "fiction", kw: /\b(fiction|story|stories|short story|novel|novella|fanfic|fan fiction|screenplay|script|scene|chapter|plot|characters?)\b/i, steps: [
      "Open a blank document or notebook",
      "Write one sentence about who wants what",
      "Jot down where and when the scene happens",
      "Set a 15-minute timer",
      "Write the scene badly, without stopping to edit",
      "Stop mid-sentence when the timer rings, so it's easy to restart",
      "Take a short break",
      "Read it back and highlight one line you like",
      "Note what happens next in one line",
      "Save the file"] },
    { id: "poem", kw: /\b(poems?|poetry|haiku|sonnet|rap|spoken word)\b/i, steps: [
      "Pick one image, feeling or moment to write about",
      "List 10 words connected to it",
      "Write the first line without judging it",
      "Keep writing lines for 5 minutes",
      "Read it out loud",
      "Cut the weakest lines",
      "Choose a title",
      "Save it"] },
    { id: "nonfiction", kw: /\b(non-?fiction|memoir|biography|article|blog|blog post|newsletter|journal entry|op-ed|review|guide|how-to)\b/i, steps: [
      "Write the main point in one sentence",
      "Brain-dump what you know as bullet points",
      "Note what you need to check or look up",
      "Put the bullets in order as headings",
      "Write the easiest section first",
      "Fill in the next section",
      "Add a short intro and ending",
      "Check facts and add sources",
      "Read it through once and save"] },
    { id: "bookwrite", kw: /\b(write a book|writing a book|my book)\b/i, steps: [
      "Write what the book is about in one sentence",
      "List the main parts or chapters, one line each",
      "Pick one chapter to start, not necessarily the first",
      "Set a 20-minute timer",
      "Write without editing until it rings",
      "Note where you stopped and what comes next",
      "Save the file with a clear name",
      "Put your next writing session in your calendar"] },
    { id: "art", kw: /\b(draw|drawing|paint|painting|sketch|sketchbook|sketching|illustrat\w*|art|artwork|comic|doodle|watercolou?r|portrait|canvas)\b/i, steps: [
      "Get your paper, canvas or tablet and tools out",
      "Pick a subject, or draw what's in front of you",
      "Do a 2-minute warm-up doodle",
      "Sketch the big shapes lightly",
      "Add the main details",
      "Add colour or shading",
      "Step back and look for one thing to adjust",
      "Sign and date it",
      "Clean brushes and put things away"] },
    { id: "video", kw: /\b(videos?|youtube|vlog|film|filming|tiktok|reel|footage|podcast|episode|animation)\b/i, steps: [
      "Write what it's about in one sentence",
      "List the shots or talking points",
      "Set up your camera, phone or mic and check the sound",
      "Record the first shot or point",
      "Record the rest, one at a time",
      "Import the clips",
      "Make a rough cut",
      "Add titles and music",
      "Export it and watch or listen once",
      "Upload or save it"] },
    { id: "craft", kw: /\b(knit|knitting|crochet|sew|sewing|embroider\w*|crafts?|pottery|origami|quilt\w*|scrapbook\w*|woodwork\w*)\b/i, steps: [
      "Get your materials and pattern out",
      "Clear a space with good light",
      "Read the next part of the pattern or plan",
      "Set a 20-minute timer",
      "Work on just that part",
      "Mark where you stopped",
      "Put loose ends and tools away"] },
    { id: "taxes", kw: /\b(tax(es)?|tax return|self[- ]assessment|irs|hmrc)\b/i, steps: [
      "Find the deadline and write it down",
      "Make a folder for tax papers",
      "Gather income documents (payslips, W-2 or P60, 1099s)",
      "Gather receipts for anything you can deduct",
      "Log in to the tax website or software",
      "Fill in your personal details",
      "Enter your income",
      "Enter deductions",
      "Review the summary",
      "Submit and save the confirmation"] },
    { id: "bills", kw: /\b(bills?|invoice|rent|pay|payment|bank|budget|finances|money)\b/i, steps: [
      "Open your banking app or the bill",
      "List what's due and the dates",
      "Pick the one due soonest",
      "Pay it",
      "Save or screenshot the confirmation",
      "Do the next one",
      "Set reminders for future due dates"] },
    { id: "paperwork", kw: /\b(form|forms|paperwork|documents?|application form|passport|visa|licen[cs]e|insurance|claim|admin)\b/i, steps: [
      "Find the form or website",
      "Read what documents they need",
      "Gather those documents in one place",
      "Fill in the easy parts (name, address, dates)",
      "Fill in the next section",
      "Note any question you can't answer and look it up",
      "Check it once",
      "Submit or post it",
      "Save a copy or the confirmation"] },
    { id: "job", kw: /\b(job|jobs|resume|cv|application|apply|interview|linkedin)\b/i, steps: [
      "Open the job ad and your CV side by side",
      "Highlight the 3 things they want most",
      "Update your CV to show those 3 things",
      "Write a short cover note, 3 short paragraphs",
      "Fill in the application form",
      "Attach your CV",
      "Read it once and submit",
      "Write down the date you applied"] },
    { id: "groceries", kw: /\b(grocer(y|ies)|food shop|shopping|supermarket|the store|shop for|milk|eggs|bread|fruit|veg|vegetables|snacks)\b/i, steps: [
      "Check the fridge and cupboards",
      "Write a list of what you're out of",
      "Add what you need for the next few meals",
      "Grab bags, keys and wallet, or open the delivery app",
      "Get the items on the list",
      "Pay",
      "Put cold things away first, then the rest"] },
    { id: "cook", kw: /\b(cook|cooking|dinner|lunch|breakfast|meal|recipe|bake|baking|cake)\b/i, steps: [
      "Pick what you're making",
      "Check you have the ingredients",
      "Clear a space on the counter",
      "Get out the pans and tools",
      "Wash and chop the ingredients",
      "Start cooking the part that takes longest",
      "Set a timer",
      "Cook the rest",
      "Serve it up",
      "Put pans to soak"] },
    { id: "errands", kw: /\b(errands?|chores)\b/i, steps: [
      "Write every errand on one list",
      "Put them in an order that makes one loop",
      "Grab keys, wallet, phone and anything to drop off",
      "Do the first errand",
      "Tick it off and do the next",
      "Head home and put things away"] },
    { id: "exercise", kw: /\b(exercise|workout|work out|gym|run|running|jog|yoga|walk|stretch|swim)\b/i, steps: [
      "Put on your workout clothes and shoes",
      "Fill a water bottle",
      "Pick one short routine or route",
      "Warm up for 3 minutes",
      "Do the first part",
      "Keep going for the rest of it",
      "Cool down and stretch",
      "Drink water"] },
    { id: "pack", kw: /\b(pack|packing|suitcase|trip|holiday|vacation|travel|move house|moving|flights?|hotel)\b/i, steps: [
      "Get the bag or boxes out",
      "Write a quick list (clothes, toiletries, chargers, documents)",
      "Pack clothes first",
      "Pack toiletries",
      "Pack chargers and electronics",
      "Put passport, tickets or keys in one pocket",
      "Check the list once",
      "Put the bag by the door"] },
    { id: "presentation", kw: /\b(presentation|slides|slide deck|powerpoint|pitch|(give|prepare|practise|practice) a talk)\b/i, steps: [
      "Write the one main message in a sentence",
      "List 3 to 5 points that support it",
      "Make one slide per point, titles only",
      "Add a few words or one image to each slide",
      "Make a title slide and a closing slide",
      "Practise out loud once",
      "Fix the parts that felt clumsy",
      "Save and send or upload it"] },
    { id: "garden", kw: /\b(garden|yard|lawn|mow|weeds?|plants?|rake|leaves)\b/i, steps: [
      "Put on shoes and gloves",
      "Get the tools out",
      "Pick one patch to start with",
      "Do that patch",
      "Move to the next patch",
      "Bag up the waste",
      "Put the tools away"] },
    { id: "car", kw: /\b(car serviced|car service|servic(e|ed|ing) (the|my|your) car|oil change|mot|tyres?|tires?|car insurance)\b/i, steps: [
      "Find the car's paperwork or the garage number",
      "Decide what needs doing",
      "Book a time or get the supplies",
      "Clear rubbish out of the car",
      "Do it, or take it in",
      "Note the date and the next due date"] },
    { id: "shower", first: true, kw: /\b(take|have|get in|jump in) (a|the) (shower|bath)\b/i, steps: [
      "Put a towel and clean clothes in the bathroom",
      "Turn the water on",
      "Get in",
      "Wash your hair",
      "Wash your body",
      "Turn the water off and dry off",
      "Get dressed"] },
    { id: "booking", kw: /\b(book|reserve|reservation)\b/i, steps: [
      "Decide the dates and your budget",
      "Open two sites or apps to compare",
      "Pick the option that fits best",
      "Enter your details",
      "Pay",
      "Save the confirmation",
      "Add it to your calendar"] },
    { id: "getready", first: true, kw: /\b(get ready|get dressed|morning routine|brush (your |my )?teeth|bedtime|go to bed|get up)\b/i, steps: [
      "Stand up and go to the bathroom",
      "Brush your teeth",
      "Wash or shower",
      "Put on the clothes you picked",
      "Grab keys, phone and wallet",
      "Check the time"] },
    { id: "fix", kw: /\b(fix|repair|mend|broken|install|assemble|put together|replace)\b/i, steps: [
      "Look at what's wrong and describe it in one line",
      "Search for a how-to guide or video",
      "Gather the tools and parts",
      "Clear a space to work",
      "Do the first step of the guide",
      "Do the next steps one at a time",
      "Test that it works",
      "Put the tools away"] },
    { id: "plan", kw: /\b(plan|planning|organi[sz]e|schedule|party|event|wedding|birthday)\b/i, steps: [
      "Write what you're planning in one sentence",
      "Pick a date or deadline",
      "List everything that needs to happen",
      "Put the list in order",
      "Do the first item now",
      "Put the rest in your calendar",
      "Tell anyone who needs to know"] }
  ];

  // Fallbacks keyed by leading verb, then a generic one.
  var VERB_FALLBACKS = [
    { re: /^(write|draft|type|edit|revise|proofread)$/, steps: [
      "Open a blank page for {obj}",
      "Write down the point of {obj} in one sentence",
      "List what needs to go in as bullet points",
      "Turn the first bullet into rough sentences",
      "Do the next bullet",
      "Read it through once and fix the obvious bits",
      "Save it"] },
    { re: /^(buy|order|get|grab|pick)$/, steps: [
      "Check whether you already have {obj}",
      "Decide where to get {obj}",
      "Set a budget",
      "Find {obj} in the shop or online",
      "Buy it",
      "Put it where it belongs"] },
    { re: /^(call|phone|ring|contact)$/, steps: [
      "Find the number for {obj}",
      "Write one line about why you're calling",
      "Have your calendar and any account or reference number handy",
      "Dial",
      "Say your one line",
      "Write down what you agreed"] },
    { re: /^(clean|tidy|wash|organise|organize|sort|declutter|dust)$/, steps: [
      "Set a 10-minute timer",
      "Get the supplies you need for {obj}",
      "Clear away anything that's rubbish",
      "Do the first small area of {obj}",
      "Move on to the next area",
      "Put the supplies away"] },
    { re: /^(text|message|reply|respond|answer|dm)$/, steps: [
      "Open the conversation with {obj}",
      "Read the last message once",
      "Type a short first draft, it doesn't need to be perfect",
      "Read it back once",
      "Press send",
      "Close the app"] },
    { re: /^(return|send|post)$/, steps: [
      "Find {obj} and put it by the door",
      "Look up the address or return instructions",
      "Pack it up",
      "Print or write the label",
      "Drop it off or book a collection",
      "Keep the receipt"] },
    { re: /^(cancel|renew|update)$/, steps: [
      "Find the account or website for {obj}",
      "Log in, or find the phone number",
      "Find the option to {verb}",
      "Follow the steps",
      "Save the confirmation"] }
  ];

  var GENERIC = [
    "Write down what done looks like for {obj}, in one sentence",
    "Gather what you need for {obj} in one spot",
    "Set a 10-minute timer",
    "Do the easiest first bit of {obj}",
    "Keep going until the timer rings",
    "Take a 2-minute break",
    "Do the next small part",
    "Check what's left and add steps for it",
    "Wrap up and put things away"];

  function toSecondPerson(s) {
    return s
      .replace(/\bI'm\b/gi, "you're")
      .replace(/\bI've\b/gi, "you've")
      .replace(/\bmyself\b/gi, "yourself")
      .replace(/\bmy\b/gi, "your")
      .replace(/\bmine\b/gi, "yours")
      .replace(/\bme\b/gi, "you")
      .replace(/\bI\b/g, "you")
      .replace(/\bour\b/gi, "your");
  }

  function clean(input) {
    return String(input == null ? "" : input)
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^(i (need|have|want|ought|must|should)( to)?|i('ve| have) got to|need to|have to|got to|gotta|must|should|todo:?|to do:?|to-do:?|please)\s+/i, "")
      .replace(/^to\s+/i, "")
      .replace(/[.!?…]+$/, "")
      .slice(0, 200)
      .trim();
  }

  // Split "clean the kitchen and call mum, then pay rent" into separate tasks.
  // " and " only splits when the next word is a known verb, so "salt and pepper" stays together.
  function splitTasks(text) {
    var parts = text.split(/\s*(?:[,;]|\band then\b|\bthen\b|\bafter that\b|\bplus\b)\s*/i);
    var out = [];
    parts.forEach(function (p) {
      var bits = p.split(/\s+and\s+(?:also\s+)?/i), cur = bits[0];
      for (var i = 1; i < bits.length; i++) {
        var first = (bits[i].split(/\s+/)[0] || "").toLowerCase();
        var tCur = matchTemplate(cur), tNext = matchTemplate(bits[i]);
        if (VERB_SET[first] || (tCur && tNext && tCur !== tNext)) { out.push(cur); cur = bits[i]; } else cur += " and " + bits[i];
      }
      out.push(cur);
    });
    out = out.map(function (s) { return s.trim(); }).filter(function (s) { return /[\p{L}\p{N}]/u.test(s); });
    // A trailing fragment with no verb (e.g. "eggs" in "buy milk, eggs") belongs with the previous task.
    var merged = [];
    out.forEach(function (s) {
      var first = s.split(/\s+/)[0].toLowerCase();
      var tS = matchTemplate(s), prev = merged[merged.length - 1];
      if (merged.length && !VERB_SET[first] && s.split(/\s+/).length <= 3 && (!tS || tS === matchTemplate(prev))) merged[merged.length - 1] += ", " + s;
      else merged.push(s);
    });
    return merged.slice(0, 4);
  }

  function matchTemplate(text, onlyFirst) {
    var best = null, bestPos = Infinity;
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (onlyFirst && !TEMPLATES[i].first) continue;
      var m = TEMPLATES[i].kw.exec(text);
      // Prefer the keyword that appears earliest; list order breaks ties.
      if (m && m.index < bestPos) { best = TEMPLATES[i]; bestPos = m.index; }
    }
    return best;
  }

  // Leading verbs that decide the template on their own ("fix the sink" is a repair, not dishes).
  var VERB_PRIORITY = { fix: "fix", repair: "fix", mend: "fix", install: "fix", assemble: "fix", replace: "fix",
    pay: "bills", cook: "cook", bake: "cook", study: "study", revise: "study", email: "email",
    call: "verb", phone: "verb", ring: "verb", contact: "verb", text: "verb", message: "verb", book: "booking", reserve: "booking", cancel: "verb", vacuum: "vacuum", hoover: "vacuum", mop: "vacuum", sweep: "vacuum", pack: "pack", unpack: "pack", move: "pack", mow: "garden", weed: "garden", rake: "garden" };
  var NONE = { none: true };
  function byId(id) { for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i]; return null; }

  function pickTemplate(task, verb, hasVerb, rest) {
    var t = pickRaw(task, verb, hasVerb, rest);
    if (!t || t === NONE || !hasVerb) return t;
    if (verb === "read" && /^(fiction|nonfiction|essay|poem|song)$/.test(t.id)) return byId("read");
    if (/^(write|draft|edit|finish|start|outline)$/.test(verb) && t.id === "read") return byId("bookwrite");
    if (/^(practi[sc]e)$/.test(verb) && t.id === "compose") return byId("instrument");
    if (verb === "paint" && /\b(room|bedroom|house|fence|walls?|door|ceiling|shed|kitchen|bathroom|hall|garage)\b/i.test(rest)) return byId("fix");
    return t;
  }
  function pickRaw(task, verb, hasVerb, rest) {
    return matchTemplate(task, true) ||
      (hasVerb && VERB_PRIORITY[verb] === "verb" ? NONE : null) ||
      (hasVerb && VERB_PRIORITY[verb] === "booking" && byId("call").kw.test(rest) ? byId("call") : null) ||
      (hasVerb && VERB_PRIORITY[verb] ? byId(VERB_PRIORITY[verb]) : null) ||
      (rest ? matchTemplate(rest) : null) ||
      matchTemplate(task);
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function breakOne(task) {
    var words = task.split(/\s+/);
    var verb = words[0].toLowerCase();
    var hasVerb = !!VERB_SET[verb];
    var obj = toSecondPerson(hasVerb ? words.slice(1).join(" ") : task).trim();
    var taskYou = toSecondPerson(task);
    if (/^(text|call|phone|ring|message|email|reply|get)$/.test(verb)) obj = obj.replace(/\s+back$/i, "");
    if (!obj) obj = "it";
    if (!hasVerb && obj.length) obj = obj.charAt(0).toLowerCase() + obj.slice(1);

    if (obj.length > 60) obj = obj.slice(0, 60).replace(/\s+\S*$/, "") + "…";
    var t = pickTemplate(task, verb, hasVerb, hasVerb ? words.slice(1).join(" ") : ""), steps, source;
    if (t === NONE) t = null;
    if (t) { steps = t.steps; source = t.id; }
    else {
      var vf = null;
      for (var i = 0; i < VERB_FALLBACKS.length; i++) if (VERB_FALLBACKS[i].re.test(verb)) { vf = VERB_FALLBACKS[i]; break; }
      steps = vf ? vf.steps : GENERIC;
      source = vf ? "verb:" + verb : "generic";
    }
    return {
      task: taskYou, source: source,
      steps: steps.map(function (s) {
        var vals = { obj: obj, task: taskYou, verb: verb };
        // single pass with a function, so text typed by the user is never re-scanned or treated as a pattern
        return cap(s.replace(/\{(obj|task|verb)\}/g, function (_, k) { return vals[k]; }));
      })
    };
  }

  function breakDown(input) {
    var text = clean(input);
    if (!text) return { parts: [], steps: [] };
    var tasks = splitTasks(text);
    if (!tasks.length) return { parts: [], steps: [] };
    var parts = tasks.map(breakOne);
    var steps;
    if (parts.length === 1) steps = parts[0].steps.slice();
    else {
      // Several tasks: keep each short and label which task a step belongs to.
      var per = parts.length === 2 ? 6 : parts.length === 3 ? 4 : 3;
      steps = [];
      parts.forEach(function (p) {
        var label = p.task.length > 28 ? p.task.slice(0, 26).trim() + "…" : p.task;
        p.steps.slice(0, per).forEach(function (s) { steps.push(cap(label) + ": " + s.charAt(0).toLowerCase() + s.slice(1)); });
      });
    }
    // de-duplicate while keeping order
    var seen = {};
    steps = steps.filter(function (s) { var k = s.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; });
    return { parts: parts, steps: steps };
  }

  var api = { breakDown: breakDown, _clean: clean, _split: splitTasks, _match: matchTemplate, _pick: pickTemplate, _templates: TEMPLATES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TaskSplitter = api;
})(this);
