import fs from "fs";
import path from "path";
import git from "isomorphic-git";

const dir = process.cwd();
const author = { name: "Ice", email: "ice@merkdraak.nl" };

function walk(d, acc = []) {
  for (const name of fs.readdirSync(d)) {
    if (["node_modules", ".git", "dist", ".cache", ".strapi"].includes(name)) continue;
    const p = path.join(d, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const hits = walk(path.join(dir, "src"))
  .concat(walk(path.join(dir, "types")))
  .filter((f) => {
    try {
      return /^<<<<<<< |^=======\s*$|^>>>>>>> /m.test(fs.readFileSync(f, "utf8"));
    } catch {
      return false;
    }
  });
if (hits.length) {
  console.error("Still have conflict markers:\n" + hits.join("\n"));
  process.exit(1);
}

const page = JSON.parse(fs.readFileSync("src/api/page/content-types/page/schema.json", "utf8"));
const caseSchema = JSON.parse(fs.readFileSync("src/api/case/content-types/case/schema.json", "utf8"));
console.log("page contact-form", page.attributes.sections.components.includes("sections.contact-form"));
console.log("page location", page.attributes.sections.components.includes("sections.location"));
console.log("case location", caseSchema.attributes.sections.components.includes("sections.location"));

const ours = await git.resolveRef({ fs, dir, ref: "Ice-contact" });
const theirs = await git.resolveRef({ fs, dir, ref: "origin/main" });
console.log("parents", ours.slice(0, 7), theirs.slice(0, 7));

const status = await git.statusMatrix({ fs, dir });
const dirty = status.filter((r) => !(r[1] === 1 && r[2] === 1 && r[3] === 1));
console.log("dirty", dirty.length);
for (const row of dirty) {
  const filepath = row[0];
  if (row[2] === 0) {
    await git.remove({ fs, dir, filepath });
    console.log("removed", filepath);
  } else {
    await git.add({ fs, dir, filepath });
    console.log("staged", filepath);
  }
}

const oid = await git.commit({
  fs,
  dir,
  message: "Merge branch 'main' into Ice-contact",
  author,
  parent: [ours, theirs],
});
console.log("merge commit", oid);

// cleanup any merge state
for (const name of ["MERGE_HEAD", "MERGE_MODE", "MERGE_MSG", "AUTO_MERGE"]) {
  const p = path.join(dir, ".git", name);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

const head = await git.resolveRef({ fs, dir, ref: "HEAD" });
console.log("HEAD", head.slice(0, 7));

// verify merge-base with main is now main tip
const bases = await git.findMergeBase({ fs, dir, oids: [head, theirs] });
console.log("merge-base with origin/main", bases.map((b) => b.slice(0, 7)).join(","), "equals main?", bases[0] === theirs);

try {
  await git.merge({
    fs,
    dir,
    ours: "Ice-contact",
    theirs: "origin/main",
    author,
    dryRun: true,
    abortOnConflict: true,
  });
  console.log("dryRun merge origin/main: CLEAN");
} catch (e) {
  console.log("dryRun still failing:", e.code, e.message);
}
