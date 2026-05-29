// ── Script library for Teleprompter Mode ─────────────────────────────────────
// tier: 'free' → available to all | 'pro' → Pro users only

export const SCRIPTS = [
  {
    id:          'cabin_crew',
    title:       'Cabin Crew Announcement',
    icon:        '✈️',
    category:    'Aviation',
    duration:    '~90 sec',
    difficulty:  1,
    tier:        'free',
    description: 'Read the in-flight safety announcement clearly and at a steady pace.',
    text: `Ladies and gentlemen, welcome aboard IndiGo Airlines flight 6E 342, with service from Mumbai Chhatrapati Shivaji Maharaj International Airport to Indira Gandhi International Airport in Delhi. On behalf of Captain Rajan Mehta and the entire crew, we are delighted to have you with us today.

Please ensure your seat belts are fastened, your seat backs are in the upright position, and your tray tables are stowed. All portable electronic devices must be switched to flight mode at this time.

For your safety, please take a moment to locate the emergency exits. There are six exits on this aircraft — two at the front, two over the wings, and two at the rear. The nearest exit may be behind you.

In the event of a loss of cabin pressure, oxygen masks will drop from the panel above your seat. Please place the mask over your nose and mouth, pull the strap to tighten, and breathe normally. If you are travelling with a child, please secure your own mask first before assisting others.

Life jackets are located beneath your seat. In the unlikely event of a water landing, place the jacket over your head, fasten the straps around your waist, and inflate by pulling the red tabs.

We ask that you refrain from smoking for the duration of the flight. The use of electronic cigarettes is also prohibited on board.

On behalf of your crew, thank you for choosing IndiGo. We wish you a pleasant journey.`,
  },

  {
    id:          'news_anchor',
    title:       'Breaking News Bulletin',
    icon:        '📺',
    category:    'Broadcast',
    duration:    '~75 sec',
    difficulty:  2,
    tier:        'free',
    description: 'Deliver a live news bulletin with urgency, authority, and crisp diction.',
    text: `Good evening. I'm Priya Sharma, and this is the nine o'clock news on NDTV.

Our top story tonight: The Reserve Bank of India has made a landmark announcement, reducing the repo rate by fifty basis points in an emergency monetary policy meeting held earlier today. The Governor, addressing a packed press conference at the RBI headquarters in Mumbai, stated that the decision comes in response to slowing economic growth and the need to stimulate credit expansion across key sectors.

Markets reacted immediately. The Bombay Stock Exchange Sensex surged over nine hundred points within minutes of the announcement, closing at a record high of seventy-eight thousand four hundred and sixty-two points. The Nifty Fifty index climbed two point three percent to settle at twenty-three thousand six hundred and ten.

Banking stocks led the rally, with SBI, HDFC Bank, and ICICI Bank posting gains of between three and five percent. Analysts say the rate cut signals the RBI's intent to prioritise growth over inflation control in the short term.

We will have more details and expert analysis after this short break. Stay with us.`,
  },

  {
    id:          'ted_talk',
    title:       'TED Talk Opening',
    icon:        '🎤',
    category:    'Public Speaking',
    duration:    '~80 sec',
    difficulty:  2,
    tier:        'pro',
    description: 'Open a TED-style talk with storytelling, warmth, and controlled authority.',
    text: `Imagine for a moment that you are six years old.

You are standing at the edge of a swimming pool. The water is cold. Your friends are already in, splashing and laughing. Your instructor is in the water, arms outstretched, saying — "Jump. I've got you."

But you don't jump. You stand there, heart pounding, feet frozen.

That moment — that gap between knowing you can do something and actually doing it — that is what I have spent the last fifteen years of my career studying. I am a behavioural psychologist. And what I found will surprise you.

The biggest barrier to human potential is not lack of skill. It is not lack of opportunity. It is the voice inside our head that says — "Not yet. Not me. Not now."

Today, I want to talk to you about how to silence that voice. And more importantly — how to jump.

Because here is what I know for certain: every single person in this room has stood at the edge of a pool. Every one of you has hesitated. And every one of you has the ability to leap.

The question is — what will you do with the next thirty minutes?`,
  },

  {
    id:          'weather_forecast',
    title:       'National Weather Forecast',
    icon:        '🌤️',
    category:    'Broadcast',
    duration:    '~70 sec',
    difficulty:  1,
    tier:        'pro',
    description: 'Present a regional weather update with confidence, numbers, and city names.',
    text: `Good morning, and here is your national weather update for the week ahead.

Starting with the north — Delhi and the NCR region will experience partly cloudy skies through Wednesday, with temperatures hovering between thirty-two and thirty-eight degrees Celsius. Light dust winds are expected in the afternoon. No significant rainfall is anticipated before Thursday.

Moving to the west — Mumbai and Pune are bracing for heavy showers as the Southwest Monsoon intensifies over the Arabian Sea. The India Meteorological Department has issued a yellow alert for Konkan and Goa, warning of isolated very heavy rainfall over the next forty-eight hours. Coastal fishermen are advised not to venture out to sea until Saturday.

In the south — Bengaluru will see pleasant conditions with temperatures around twenty-six degrees and occasional evening showers. Chennai remains hot and humid, with a high of thirty-five degrees expected through the week.

The northeast — Kolkata is cloudy with moderate rainfall expected on Tuesday and Wednesday. Assam and Meghalaya remain on red alert due to active monsoon conditions.

That is your national weather update. Stay safe, carry an umbrella, and do tune in at nine for the next bulletin.`,
  },

  {
    id:          'ipl_commentary',
    title:       'IPL Final Commentary',
    icon:        '🏏',
    category:    'Sports',
    duration:    '~70 sec',
    difficulty:  3,
    tier:        'pro',
    description: 'Commentate a nail-biting IPL final with high energy, pace, and drama.',
    text: `And we are LIVE from the Narendra Modi Stadium in Ahmedabad, ladies and gentlemen! Eighty thousand fans on their feet as we enter the last over of this IPL final. Mumbai Indians need fourteen runs off six balls — Hardik Pandya is at the crease, and the atmosphere here is absolutely ELECTRIC!

Bumrah runs in — bowls a fuller one — and Pandya goes DOWNTOWN! That has gone into the second tier of the stands! SIX! The crowd erupts! Mumbai Indians need eight off five!

The fielders are scrambling to reset. The tension here is palpable.

Back of a length, angled into the pads — Pandya whips it through midwicket — they run two — six off four!

This is extraordinary cricket. Two required off one ball. Pandya raises his bat to the crowd. He knows what is at stake. The bowler approaches the crease — the whole stadium holds its breath —

He BOWLS — full toss — Pandya swings — it's going, GOING — it's GONE! SIXER! MUMBAI INDIANS WIN THE IPL! For the sixth time! Pandya falls to his knees! The dugout erupts! History is MADE in Ahmedabad tonight!`,
  },

  {
    id:          'product_launch',
    title:       'Product Launch Keynote',
    icon:        '🚀',
    category:    'Corporate',
    duration:    '~80 sec',
    difficulty:  2,
    tier:        'pro',
    description: 'Open a product launch with executive presence, storytelling, and build-up.',
    text: `Good morning, everyone. Thank you for being here.

Two years ago, I stood in a room much like this one — with a team of eleven people and a single conviction: that the way we work today is fundamentally broken.

We spend three hours a day in meetings that should be emails. We write reports that nobody reads. We build dashboards that nobody checks. And at the end of the day, we go home exhausted — not because we did great work, but because we spent all our energy just trying to stay organised.

Today, that changes.

Today, we introduce Aura — India's first AI-native productivity platform, built specifically for how Indian teams work. Not adapted from a Silicon Valley product. Not translated from English. Built from scratch. For us.

Aura understands your meeting notes in Hindi, Tamil, and Marathi. It integrates natively with the tools your teams already use — from Zoho to Tally to WhatsApp Business. And it learns your workflow, not the other way around.

In our beta, teams reported saving an average of eleven hours per week. That is one and a half working days — given back to you, every single week.

Ladies and gentlemen — the future of Indian enterprise software is not imported. It is invented here. And it starts today.

Please welcome — Aura.`,
  },
]
