(() => {
  const groups = window.playerDirectoryData ?? [];
  const search = document.getElementById("directory-search");
  const generation = document.getElementById("directory-generation");
  const position = document.getElementById("directory-position");
  const standing = document.getElementById("directory-standing");
  const sort = document.getElementById("directory-sort");
  const direction = document.getElementById("directory-direction");
  const results = document.getElementById("directory-results");
  const status = document.getElementById("directory-status");
  const pagination = document.getElementById("directory-pagination");
  const pageLabel = document.getElementById("directory-page");
  const previous = document.getElementById("directory-prev");
  const next = document.getElementById("directory-next");
  const dialog = document.getElementById("directory-profile");
  const pageSize = 24;

  if (!groups.length) {
    status.textContent = "The player directory could not be loaded.";
    for (const control of [search, generation, position, standing, sort, direction]) control.disabled = true;
    return;
  }

  const numeric = new Set(["pot", "rating", "apps", "minutes"]);
  const seniorTemplate = window.combinedProfile?.senior;
  const collate = new Intl.Collator("en", { sensitivity: "base" });
  const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  let page = 0;
  let order = 1;

  const players = groups.flatMap(({ key, label, report, generated, players }) => players.map(player => ({
    ...player,
    generation: key,
    label,
    report,
    generated,
    filterStanding: key === "young" && player.watch ? "Leader" : player.gs,
    minutes: player.cs_mins == null && player.c1_mins == null ? null : (player.cs_mins || 0) + (player.c1_mins || 0),
    searchText: normalize([player.name, player.cn, player.alias, player.club, player.pos].filter(Boolean).join(" ")),
  })));

  for (const { key, label } of groups) generation.add(new Option(label, key));
  for (const major of ["Goalkeeper", "Defender", "Midfielder", "Forward"]) {
    const group = document.createElement("optgroup");
    group.label = major;
    const matching = players.filter(player => player.major === major);
    group.append(new Option("All " + major.toLowerCase() + "s", "major:" + major));
    const roles = [...new Set(matching.map(player => player.pos).filter(role => role && role !== major))].sort(collate.compare);
    for (const role of roles) group.append(new Option(role, "role:" + major + ":" + role));
    position.append(group);
  }

  function span(className, text) {
    const element = document.createElement("span");
    element.className = className;
    element.textContent = text;
    return element;
  }

  function openProfile(player) {
    const url = player.report + "?player=" + encodeURIComponent(player.name);
    const template = window.combinedProfile?.[player.generation === "young" ? "young" : "senior"]?.details;
    if (!template || !dialog.showModal) {
      location.href = url;
      return;
    }
    dialog.innerHTML = template(player, player.generated);
    dialog.dataset.generation = player.generation;
    dialog.setAttribute("aria-label", player.name + " player profile");
    dialog.querySelector(".pm-meta").prepend(span("directory-badge", player.label));
    const source = document.createElement("a");
    source.className = "directory-profile-source";
    source.href = url;
    source.textContent = "Open generation report";
    dialog.append(source);
    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector(".cls").focus();
  }

  window.openCombinedProfile = (name, label) => {
    const player = players.find(row => label ? row.name === name && row.label === label : row.name + " · " + row.label === name);
    if (player) openProfile(player);
  };

  function attachPortrait(avatar, photo) {
    if (!avatar || !photo || avatar.querySelector("img")) return;
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => image.remove(), { once: true });
    image.src = photo;
    avatar.append(image);
  }

  for (const card of document.querySelectorAll(".cards > .card")) {
    const group = groups.find(row => row.report === card.querySelector(".btn.primary")?.getAttribute("href"));
    if (!group) continue;
    for (const lead of card.querySelectorAll(".player")) {
      const name = lead.querySelector(".who > b")?.textContent;
      const player = group.players.find(row => row.name === name);
      attachPortrait(lead.querySelector(".avatar"), player?.photo);
    }
  }

  function playerCard(player) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "directory-player";
    button.dataset.generation = player.generation;
    button.addEventListener("click", () => openProfile(player));

    const avatar = span("avatar", player.name.charAt(0));
    avatar.setAttribute("aria-hidden", "true");
    attachPortrait(avatar, player.photo);

    const detail = document.createElement("span");
    detail.append(span("directory-name", [player.name, player.cn].filter(Boolean).join(" · ")));
    const meta = [player.pos, player.club, player.generation === "young" && player.year].filter(Boolean);
    if (meta.length) detail.append(span("directory-meta", meta.join(" · ")));
    const badge = span("directory-badge", player.label);
    badge.setAttribute("aria-label", "Generation " + player.label);
    button.append(avatar, detail, badge);
    const facts = [
      player.apps != null && player.apps + " apps",
      player.rating != null && player.rating + " FotMob",
      player.minutes != null && player.minutes.toLocaleString() + " career min",
    ].filter(Boolean);
    if (facts.length) button.append(span("directory-facts", facts.join(" · ")));
    const evaluation = document.createElement("span");
    evaluation.className = "pd-eval directory-evaluation";
    evaluation.innerHTML = seniorTemplate?.evaluation(player) || "";
    if (player.pot) {
      const potential = span("ev directory-potential", "★ " + player.pot);
      potential.title = "Scouted potential";
      evaluation.prepend(potential);
    }
    if (player.watch) evaluation.append(span("ev directory-potential", "Watch"));
    if (evaluation.childElementCount) button.append(evaluation);
    item.append(button);
    return item;
  }

  function comparePlayers(a, b) {
    const key = sort.value;
    let comparison;
    if (numeric.has(key)) {
      const value = player => key === "pot" ? seniorTemplate?.potential(player.pot) :
        player[key] == null || player[key] === "" ? NaN : Number(player[key]);
      const left = value(a);
      const right = value(b);
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return Number(Number.isFinite(right)) - Number(Number.isFinite(left)) || collate.compare(a.name, b.name);
      }
      comparison = left - right;
    } else {
      comparison = collate.compare(a[key] ?? "", b[key] ?? "");
    }
    return order * comparison || collate.compare(a.name, b.name);
  }

  function render() {
    const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    const matches = players.filter(player =>
      (!generation.value || generation.value === player.generation) &&
      (!standing.value || standing.value === player.filterStanding) &&
      (!position.value || position.value === "major:" + player.major || position.value === "role:" + player.major + ":" + player.pos) &&
      terms.every(term => player.searchText.includes(term))
    ).sort(comparePlayers);
    const start = page * pageSize;
    const end = Math.min(start + pageSize, matches.length);
    const pages = Math.ceil(matches.length / pageSize);
    results.replaceChildren(...matches.slice(start, end).map(playerCard));
    status.textContent = matches.length ? "Showing " + (start + 1) + "–" + end + " of " + matches.length + " players" : "No players match these filters.";
    pagination.hidden = pages <= 1;
    previous.disabled = page === 0;
    next.disabled = page + 1 >= pages;
    pageLabel.textContent = "Page " + (page + 1) + " of " + pages;
  }

  function resetPage() {
    page = 0;
    render();
  }

  function setOrder(value) {
    order = value;
    direction.textContent = order === 1 ? "↑" : "↓";
    direction.title = "Switch to " + (order === 1 ? "descending" : "ascending") + " order";
    direction.setAttribute("aria-label", direction.title);
    resetPage();
  }

  function changePage(offset) {
    page += offset;
    render();
    status.focus();
    status.scrollIntoView({ block: "start" });
  }

  dialog.addEventListener("click", event => {
    if (event.target.closest(".cls")) dialog.close();
    const tab = event.target.closest(".ov-tab");
    if (!tab) return;
    dialog.querySelectorAll(".ov-tab").forEach(button => button.classList.toggle("on", button === tab));
    dialog.querySelectorAll(".ov-body").forEach(body => body.classList.toggle("on", body.dataset.ov === tab.dataset.ov));
  });
  search.addEventListener("input", resetPage);
  for (const filter of [generation, position, standing]) filter.addEventListener("change", resetPage);
  sort.addEventListener("change", () => setOrder(numeric.has(sort.value) ? -1 : 1));
  direction.addEventListener("click", () => setOrder(-order));
  previous.addEventListener("click", () => changePage(-1));
  next.addEventListener("click", () => changePage(1));
  render();
})();

