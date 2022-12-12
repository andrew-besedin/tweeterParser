import fetch from "node-fetch";
import dotenv from "dotenv";
import { Context, Telegraf } from "telegraf";
import Storage from "node-storage";
import fs from "fs";

dotenv.config();

const subscribeStorage = new Storage("./subscribes.json");

const subscribingSet = new Set();
const unsubscribingSet = new Set();

let guestToken = "1602321551516393480";
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Welcome'));

bot.command("launch", (ctx) => {
    ctx.reply("Поиск начался.");
});

bot.command("subscribe", (ctx) => {
    let userName = ctx.message.from.username;
    unsubscribingSet.delete(userName)
    subscribingSet.add(userName);
    ctx.reply("Введите логин пользователя, на которого хотите подписаться (прим. @IvanIvanov)");
});

bot.command("unsubscribe", (ctx) => {
    let userName = ctx.message.from.username;
    subscribingSet.delete(userName);
    unsubscribingSet.add(userName);
    ctx.reply("Введите логин пользователя, от которого хотите отписаться (прим. @IvanIvanov)");
});

bot.on("message", async (ctx) => { 
    if (subscribingSet.has(ctx.message.from.username)) {
        let twitterUser = ctx.message.text.split("@")[1];
        let twitterId;
        subscribingSet.delete(ctx.message.from.username);
        try {
            twitterId = await fetch(`https://twitter.com/i/api/graphql/X7fFRSOaxfcxCk0VGDIKdA/UserByScreenName?variables=%7B%22screen_name%22%3A%22${twitterUser}%22%2C%22withSafetyModeUserFields%22%3Atrue%2C%22withSuperFollowsUserFields%22%3Atrue%7D&features=%7B%22responsive_web_twitter_blue_verified_badge_is_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22responsive_web_twitter_blue_new_verification_copy_is_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D`, {
                "headers": {
                  "accept": "*/*",
                  "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                  "content-type": "application/json",
                  // "x-csrf-token": "3e9611204d32c19dfa6bf85107a6c7e3",
                  "x-guest-token": guestToken,
                  "x-twitter-active-user": "yes",
                  "x-twitter-client-language": "ru",
                  // "cookie": "guest_id_marketing=v1%3A166533421334983565; guest_id_ads=v1%3A166533421334983565; _gid=GA1.2.32289709.1670597060; des_opt_in=Y; _gcl_au=1.1.1897013118.1670669486; _ga_BYKEBDM7DS=GS1.1.1670672332.2.0.1670672332.0.0.0; gt=1601662707975000067; kdt=PRwcTUDCJiEZnY9GPH4XY0wMZWx68AHvwAPdcZ2T; att=1-aCAhmh4TbkGcZgrODsWGqRBLZoTrAgXIPQI2ubRF; at_check=true; mbox=PC#7301e7258be94071b9a7281ff635b9b4.37_0#1733947432|session#b7e33460ed5648c3940af64ff0069cbd#1670704492; _ga=GA1.2.524069522.1665334215; dnt=1; ct0=3e9611204d32c19dfa6bf85107a6c7e3; _sl=1; personalization_id=\"v1_NleL91y4TeF0ihau6J+qZw==\"; guest_id=v1%3A167070328455296106; _ga_34PHSZMC42=GS1.1.1670701279.3.1.1670703402.0.0.0; g_state={\"i_l\":1,\"i_p\":1670710951469}",
                },
                "body": null,
                "method": "GET"
            }).then(res => res.json()).then(res => {
                if (!res.data.user?.result?.rest_id) {
                    ctx.reply("Такого пользователя не существует.");
                    return undefined;
                } else {
                    return res.data.user.result.rest_id;
                }
            });
        } catch(err) {
            ctx.reply("Произошла непредвиденная ошибка.");
            fs.appendFileSync("./error.txt", err.toString() + "\r\n");
            console.error(err);
            return;
        }
        if (twitterId) {
            subscribeStorage.put(`${ctx.message.from.username}.${twitterId}`, { twitterUser });
            ctx.reply("Вы успешно подписались на обновления пользователя @" + twitterUser);
        }
        return;
    } 
    if (unsubscribingSet.has(ctx.message.from.username)) {
        unsubscribingSet.delete(ctx.message.from.username);
        const userSubscribes = subscribeStorage.get(ctx.message.from.username);
        let twitterId;
        if (userSubscribes) {   
            twitterId = Object.keys(userSubscribes).find(e => userSubscribes[e].twitterUser == ctx.message.text.split("@")[1]);
        }
        if (!twitterId) ctx.reply("Вы не подписаны на этого пользователя.");
        if (twitterId) {
            subscribeStorage.remove(ctx.message.from.username + "." + twitterId);
            ctx.reply("Вы усешно отписались от этого пользователя.");
        }
        return;
    }
    ctx.reply("Бот не понял, что вы просите сделать. Пропишите /help для подробной помощи.");
});

bot.launch();