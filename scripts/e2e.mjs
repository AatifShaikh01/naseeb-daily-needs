/**
 * NASEEB — end-to-end auth + stock test (dev server ke against).
 *
 *   npx next dev --port 3300        (ek terminal me)
 *   E2E_BASE=http://localhost:3300 node scripts/e2e.mjs
 *
 * NOTE: default PIN se login hote hi must_change_pin=true hota hai aur login
 * user ko /change-pin par bhej deta hai. Test ke shuru me DB se
 * must_change_pin=false kar dein (upar wali command) taaki dashboard khule.
 */
const BASE = process.env.E2E_BASE ?? "http://localhost:3300";
const USER = process.env.E2E_USER ?? "aasif";
const PIN = process.env.E2E_PIN ?? "1234";

let pass = 0;
let fail = 0;
function check(label, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} ${extra}`);
  }
}

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function formFields(formHtml) {
  const fields = {};
  const re = /<input[^>]*type="hidden"[^>]*>/g;
  for (const tag of formHtml.match(re) ?? []) {
    const name = tag.match(/name="([^"]*)"/)?.[1];
    if (!name) continue;
    const value = tag.match(/value="([^"]*)"/)?.[1];
    fields[name] = value === undefined ? "" : decode(value);
  }
  return fields;
}

function allForms(html) {
  const forms = [];
  const re = /<form[\s\S]*?<\/form>/g;
  for (const m of html.matchAll(re)) forms.push(m[0]);
  return forms;
}

function multipart(fields) {
  const boundary = "----e2e" + Math.random().toString(16).slice(2);
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`,
    );
  }
  parts.push(`--${boundary}--\r\n`);
  return {
    body: parts.join(""),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function sessionCookie(res) {
  for (const c of res.headers.getSetCookie()) {
    const m = c.match(/naseeb_session=([^;]*)/);
    if (m) return m[1];
  }
  return null;
}

async function post(path, fields, cookie) {
  const mp = multipart(fields);
  return fetch(BASE + path, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": mp.contentType,
      ...(cookie ? { Cookie: `naseeb_session=${cookie}` } : {}),
    },
    body: mp.body,
  });
}

async function postForm(formHtml, path, extra, cookie) {
  const fields = { ...formFields(formHtml), ...extra };
  return post(path, fields, cookie);
}

/* ================= TEST FLOW ================= */
console.log(`\nNASEEB E2E — target: ${BASE} (user: ${USER})\n`);

/* 1. Unauthenticated protected route → redirect /login */
console.log("[1] Protected routes (no session)");
let res = await get("/stock");
check("GET /stock → redirect /login", (res.headers.get("location") ?? "").includes("/login"),
  `(got ${res.headers.get("location")})`);
res = await get("/settings");
check("GET /settings → redirect /login", (res.headers.get("location") ?? "").includes("/login"),
  `(got ${res.headers.get("location")})`);

/* 2. Login — wrong PIN */
console.log("\n[2] Login (wrong PIN)");
let loginF = await loginForm();
res = await postForm(loginF, "/login", { username: USER, pin: "9999" });
const wrongBody = await res.text();
check("wrong PIN → error dikha", /wrong|incorrect|invalid|galat|not match/i.test(wrongBody));

/* 3. Login — correct PIN */
console.log("\n[3] Login (correct PIN)");
loginF = await loginForm();
res = await postForm(loginF, "/login", { username: USER, pin: PIN });
const cookie = sessionCookie(res);
check("session cookie set hui", !!cookie, `(${res.headers.getSetCookie().join(" | ")})`);
const loc = res.headers.get("location") ?? "";
check("redirect dashboard/change-pin", loc.includes("/") && !loc.includes("login?"), `(got ${loc})`);

if (!cookie) {
  console.log("\n❌ Cookie nahi mili — aage badh nahi sakte.\n");
  process.exit(1);
}

/* 4. Pages load with session */
console.log("\n[4] Pages load (with session)");
for (const p of ["/", "/stock", "/products", "/settings", "/more", "/pending", "/sale"]) {
  res = await get(p, cookie);
  check(`GET ${p} → 200`, res.status === 200, `(got ${res.status})`);
}

/* 5. Header shows user name */
res = await get("/", cookie);
const homeHtml = (await res.text()).replace(/<!--.*?-->/g, ""); // React SSR markers hatao
check(`header me logged-in user dikha (@${USER})`, homeHtml.includes(`@${USER}`));

/* 6. Stock In — multi-row add */
console.log("\n[6] Stock In (multi-row)");
res = await get("/stock?tab=current", cookie);
const stockHtml = await res.text();
const stockForm = allForms(stockHtml).find((f) => /name="entries"/.test(f));
check("stock form mila (entries hidden field)", !!stockForm);
if (stockForm) {
  const entries = JSON.stringify([
    { productId: 1, boxes: 10 },
    { productId: 2, boxes: 5 },
  ]);
  const fields = formFields(stockForm);
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  fields.entryDate = today;
  fields.supplier = "E2E Test Supplier";
  fields.note = "e2e multi-row";
  fields.entries = entries;
  res = await post("/stock", fields, cookie);
  const sloc = res.headers.get("location") ?? "";
  check("stock save → redirect /stock?saved", sloc.includes("saved"), `(got ${sloc})`);
  res = await get("/stock?tab=current", cookie);
  const afterHtml = (await res.text()).replace(/<!--.*?-->/g, "");
  check("today's entries me 10 boxes dikha", /10 boxes/.test(afterHtml));
  check("today's entries me 5 boxes dikha", /5 boxes/.test(afterHtml));
}

/* 7. Logout */
console.log("\n[7] Logout");
res = await get("/", cookie);
const logoutForm = allForms(await res.text()).find(
  (x) => /\$ACTION/.test(x) && !/name="username"/.test(x) && !/name="oldPin"/.test(x),
);
check("logout form mila", !!logoutForm);
if (logoutForm) {
  res = await postForm(logoutForm, "/", {}, cookie);
  check("logout → 303", res.status === 303, `(got ${res.status})`);
  check("redirect → /login", (res.headers.get("location") ?? "").includes("/login"));
  const cleared = res.headers.getSetCookie()
    .some((c) => /naseeb_session=(;|$)/.test(c) || /Max-Age=0/.test(c));
  check("session cookie clear hui", cleared);
}
res = await get("/");
check("cookie ke bina / → redirect /login", (res.headers.get("location") ?? "").includes("/login"));

/* ---------- summary ---------- */
console.log(`\n${fail === 0 ? "✅" : "❌"} RESULT: ${pass} pass, ${fail} fail\n`);
process.exit(fail === 0 ? 0 : 1);


async function get(path, cookie) {
  return fetch(BASE + path, {
    redirect: "manual",
    headers: cookie ? { Cookie: `naseeb_session=${cookie}` } : {},
  });
}

async function loginForm() {
  const html = await (await get("/login")).text();
  const f = allForms(html).find((x) => /name="username"/.test(x));
  if (!f) throw new Error("login form nahi mila");
  return f;
}
