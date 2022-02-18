require("dotenv").config()

const {Client, Intents} = require("discord.js")
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

function sleep(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

const create_events = async (matches) => {
  for(let match of matches){
    const Stage_Event = await event.createEvent("819416225360379944", {
      entity_type: 2, //voice
      channel_id: "819416225360379949", //a voice id
      name: match['Match ID'], //Event Name
      scheduled_start_time: match['Match Time (EST)'], //ISO 8601 time format
      description: match['Match ID'] + ' ' + match['Match Format'] + ' in ' + match['Restream Channel'] //OPTIONAL
    })
    await sleep(10 * 1000)
  }
}

client.on("ready",  () => {
  console.log("Gamer moment")
})

client.on("messageCreate", async (msg) => {
  const fecha = "Wed, 7/28 2:00 PM GMT-4"
  //if(msg.author.bot){
  //  return
  //}
  
  //readXlsxFile('times_speedrun.xlsx').then((rows) => {
  //  console.log(rows)
  //})

  //client.channels.cache.get("882016606383906816").send("Soy el arias y...")

  const base = Airtable.base(process.env.AIRTABLE_BASE_ID)
  const matches = []
  await base('Season 4 Matches')
        .select({filterByFormula:
                'OR({Status} = "Scheduled", {Status} = "Scheduled")',
        })
        .eachPage((records, fetchNextPage) => {
          try {
            records.forEach(record => {
              matches.push(record.fields)
            });
            fetchNextPage();
          } catch (e) {
            return;
          }
        });
  console.log(matches)
  
  if(msg.content === "codigo secreto"){
    create_events(matches)
  }
})

client.login(process.env.BOT_LOGIN)