require("dotenv").config()

const {Client, Intents, ClientPresence, InviteGuild} = require("discord.js")
const {DiscordEventManager} = require('discord-events')
const Airtable = require('airtable')

const event = new DiscordEventManager(process.env.BOT_LOGIN, process.env.BOT_ID)

const client = 
  new Client({
    intents: [
      Intents.FLAGS.GUILDS, 
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MESSAGE_TYPING,
      Intents.FLAGS.GUILD_VOICE_STATES,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_SCHEDULED_EVENTS
    ]
  })

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

let SC_VOICE = "819416225360379949" // sunshine community voice chat
let BINGO_VOICE = "819416225360379949" // bingothon voice chat
let OFFLINE_VOICE = "819416225360379949" // offline voice chat

const PING_TIMER = 3600 * 1000 * 5

let created_matches = new Set()
let GUILD_INSTANCE = ""

const voiceId = (restream_channel) => {
  if(restream_channel === "SunshineCommunity") {
    return SC_VOICE
  } else if(restream_channel === "Bingothon") {
    return BINGO_VOICE
  } 
  return OFFLINE_VOICE
}

const getAllMatches = async () => {
  const base = Airtable.base(process.env.AIRTABLE_BASE_ID)
  const matches = []
  await base('Season 4 Matches')
        .select({filterByFormula:
          '{Status} = "Scheduled"',
        }).eachPage((records, fetchNextPage) => {
          try {
            records.forEach(record => {
              matches.push(record.fields)
            })
            fetchNextPage();
          } catch (e) {
            return;
          }
        })
  return matches
}

const createEvents = async (matches) => {

  for(let match of matches) {

    if (created_matches.has(match["Match ID"])){
      console.log("An event is already created for this match")
      console.log(`> ${match["Match ID"]} <`);
      continue
    }

    created_matches.add(match["Match ID"])

    let lets_try = true;

    while(lets_try) {
      try {
        console.log("Trying to create a new event");
        const Stage_Event = await event.createEvent(GUILD_INSTANCE.id, {
          entity_type: 2, //voice
          channel_id: voiceId(match['Restream Channel']), //a voice id
          name: match["Match ID"], //Event Name
          scheduled_start_time: match["Match Time (EST)"], //ISO 8601 time format
          description: `${match["Match ID"]} ${match['Match Format']} in ${match['Restream Channel']}`
        });
        
        lets_try = false;
        await sleep(10 * 1000)
      } catch(error) {
        console.log("Rate limit error - waiting 20 seconds");
        await sleep(20 * 1000)
      } 
    }
  }
}

const updateEvents = async () => {
  const all_events = await GUILD_INSTANCE.scheduledEvents.fetch();
  const matches = await getAllMatches()

  let pair_match_event = new Map();

  for(let event of all_events) {
    const guild_event = event[1]
    pair_match_event.set(guild_event.name, guild_event);
  }

  for(let match of matches) {
    //console.log(pair_match_event.has(String(match["Match ID"])))
    if (pair_match_event.has(match["Match ID"])) {
      console.log("Updating event")
      console.log(`> ${match["Match ID"]} <`);
      const updated_event = await GUILD_INSTANCE
            .scheduledEvents
            .edit(pair_match_event.get(match["Match ID"]),
              {
              entityType: 2,
              channel: voiceId(match['Restream Channel']),
              scheduledStartTime: match["Match Time (EST)"], 
              description: `${match["Match ID"]} ${match['Match Format']} in ${match['Restream Channel']}`,
            });
      console.log(updated_event)
    }

  }
  
}

/*
setInterval( async () => {
  const matches = await getAllMatches();
  createEvents(matches);
}, PING_TIMER)
*/

/*
setInterval( async () => {
  const matches = await getAllMatches();
  createEvents(matches);
}, PING_TIMER * 2)
*/

client.on("ready",  async () => {
  
  const Guilds = client.guilds.cache.map( (guild) => {
    GUILD_INSTANCE = guild;
  });

  console.log("- SMS-BOT -");
  console.log(`Connected to Guild ID: ${GUILD_INSTANCE.id}`);

  const all_events = await GUILD_INSTANCE.scheduledEvents.fetch();

  for (const event of all_events) {
    created_matches.add(event[1].name);
  }
})

client.on("messageCreate", async (msg) => {
  //if(msg.author.bot){
  //  return
  //}
  

  //client.channels.cache.get("882016606383906816").send("Soy el arias y...")

  const base = Airtable.base(process.env.AIRTABLE_BASE_ID)
  const matches = await getAllMatches();
  if(msg.content === "loool") {
    await createEvents(matches)
  } else if(msg.content === "loool u"){
    await updateEvents()
  }
})

client.login(process.env.BOT_LOGIN)