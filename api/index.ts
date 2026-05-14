import express from "express";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

// API endpoints to fetch stats
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/platform/leetcode/:handle", async (req, res: any) => {
  try {
    const { handle } = req.params;
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query getUserProfile($username: String!) { 
            matchedUser(username: $username) { 
              profile { reputation ranking }
              submitStats { acSubmissionNum { difficulty count } } 
            } 
          }`,
        variables: { username: handle }
      })
    });
    const data = await response.json();
    if (data.errors || !data.data?.matchedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const matchedUser = data.data.matchedUser;
    const allStats = matchedUser.submitStats.acSubmissionNum.find((s: any) => s.difficulty === "All");
    
    res.json({ 
      solved: allStats?.count || 0,
      details: {
        reputation: matchedUser.profile?.reputation || 0,
        ranking: matchedUser.profile?.ranking || 0
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch LeetCode" });
  }
});

app.get("/api/platform/codeforces/:handle", async (req, res: any) => {
  try {
    const { handle } = req.params;
    
    // Fetch user info for rating/rank details
    const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
    const infoData = await infoRes.json();
    
    let details: any = {};
    if (infoData.status === "OK" && infoData.result && infoData.result.length > 0) {
      const user = infoData.result[0];
      details = {
        rating: user.rating || 0,
        rank: user.rank || "Unrated",
        maxRating: user.maxRating || 0
      };
    }

    // Fetch user status for solved problems
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
    const data = await response.json();
    if (data.status !== "OK") {
      return res.status(404).json({ error: "User not found" });
    }
    
    const solvedProblems = new Set();
    for (const sub of data.result) {
      if (sub.verdict === "OK" && sub.problem && sub.problem.name) {
        solvedProblems.add(sub.problem.name);
      }
    }
    
    res.json({ 
      solved: solvedProblems.size,
      details
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch Codeforces" });
  }
});

app.get("/api/platform/codechef/:handle", async (req, res: any) => {
  try {
    const { handle } = req.params;
    const response = await fetch(`https://www.codechef.com/users/${handle}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok) return res.status(404).json({ error: "User not found" });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let solved = 0;
    const problemCounterText = $("h3:contains('Total Problems Solved:')").first().text() || 
                               $("h3:contains('Fully Solved (')").first().text();
    const match = problemCounterText.match(/\d+/);
    if (match) {
      solved = parseInt(match[0], 10);
    } else {
      const fullySolvedText = $("section.rating-data-section h3:contains('Fully Solved')").text();
      const m2 = fullySolvedText.match(/\((\d+)\)/);
      if (m2) solved = parseInt(m2[1], 10);
    }

    // Fetch Codechef Ratings and Stars
    let rating = 0;
    let stars = "1*";
    const ratingText = $(".rating-number").first().text();
    if (ratingText) rating = parseInt(ratingText, 10);
    
    const starText = $(".rating-star").first().text();
    if (starText) stars = starText.trim();
    else if ($(".rating-header .rating").length) {
        // Alternative selector for stars
        stars = $(".rating-header .rating").text() || "1*";
    }

    res.json({ 
      solved,
      details: {
        rating,
        stars
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch CodeChef" });
  }
});

app.get("/api/platform/cses/:id", async (req, res: any) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    
    const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0" };
    if (token && typeof token === 'string') {
      headers["Cookie"] = `PHPSESSID=${token}`;
    }

    let solved = 0;
    let ranking = "Unranked";
    let firstSubmission = "";

    if (id !== "_") {
      const response = await fetch(`https://cses.fi/user/${id}`, { headers });
      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // 1. Check if "Solved tasks:" exists explicitly (legacy or different locale)
        const solvedText = $("table tr td:contains('Solved tasks:')").next().text();
        let match = solvedText.match(/\d+/);
        if (match) {
          solved = parseInt(match[0], 10);
        } else {
          // 2. Check Course progress table for "CSES Problem Set"
          const csesProbText = $("a").filter(function() { return $(this).text().trim() === 'CSES Problem Set'; }).closest('td').next('td').text();
          match = csesProbText.match(/\d+/);
          if (match) {
            solved = parseInt(match[0], 10);
          }
        }

        const rankText = $("table tr td:contains('Ranking:')").next().text();
        if (rankText) {
          ranking = rankText.trim();
        } else {
           const altRankText = $("td").filter(function() { return $(this).text().trim() === 'Ranking:'; }).next().text();
           if (altRankText) {
              ranking = altRankText.trim();
           }
        }

        const firstSubText = $("table tr td:contains('First submission:')").next().text();
        if (firstSubText) {
          firstSubmission = firstSubText.trim();
        }
      } else if (!token) {
        return res.status(404).json({ error: "User not found" });
      }
    }

    // 3. If we STILL have 0, and a token is provided, let's fetch the main problemset page
    if (solved === 0 && token) {
      const pResponse = await fetch(`https://cses.fi/problemset/`, { headers });
      if (pResponse.ok) {
        const pHTml = await pResponse.text();
        const $$ = cheerio.load(pHTml);
        const fullScores = $$("span.task-score.icon.valid, span.task-score.icon.full").length;
        if (fullScores > 0) {
          solved = fullScores;
        }
      }
    }

    res.json({ 
      solved,
      details: {
        ranking,
        firstSubmission
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch CSES" });
  }
});

export default app;
