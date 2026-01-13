const defaultApi = "https://pet-api-function-gfchhzhua4dqd4cr.ukwest-01.azurewebsites.net/api";

const els = {
  apiBase: document.getElementById("apiBase"),
  saveApi: document.getElementById("saveApi"),
  refresh: document.getElementById("refresh"),
  create: document.getElementById("create"),
  petName: document.getElementById("petName"),
  petType: document.getElementById("petType"),
  list: document.getElementById("list"),
  error: document.getElementById("error"),
};

function getApi() {
  return (localStorage.getItem("apiBase") || defaultApi).replace(/\/$/, "");
}
function setApi(v) {
  localStorage.setItem("apiBase", v.replace(/\/$/, ""));
}
els.apiBase.value = getApi();

function showError(msg) {
  els.error.textContent = msg || "";
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && (data.error || data.details)) || `HTTP ${res.status}`);
  return data;
}

async function loadPets() {
  showError("");
  els.list.innerHTML = "Loading...";
  try {
    const pets = await jsonFetch(`${getApi()}/pets`);
    renderPets(Array.isArray(pets) ? pets : []);
  } catch (e) {
    els.list.innerHTML = "";
    showError(e.message);
  }
}

function renderPets(pets) {
  els.list.innerHTML = "";
  if (pets.length === 0) {
    els.list.textContent = "No pets yet.";
    return;
  }

  for (const pet of pets) {
    const card = document.createElement("div");
    card.className = "card";

    const top = document.createElement("div");
    top.className = "cardTop";

    const left = document.createElement("div");
    left.innerHTML = `
      <div><b>ID:</b> ${pet.id}</div>
      <div><b>Created:</b> ${pet.createdAt || ""}</div>
      <div><b>Name:</b> <input data-edit-name value="${pet.petName || ""}"></div>
      <div><b>Type:</b> <input data-edit-type value="${pet.petType || ""}"></div>
    `;

    const right = document.createElement("div");
    const btnSave = document.createElement("button");
    btnSave.textContent = "Save";
    btnSave.onclick = async () => {
      showError("");
      try {
        const name = left.querySelector("[data-edit-name]").value;
        const type = left.querySelector("[data-edit-type]").value;
        await jsonFetch(`${getApi()}/pets/${pet.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ petName: name, petType: type }),
        });
        await loadPets();
      } catch (e) { showError(e.message); }
    };

    const btnDel = document.createElement("button");
    btnDel.textContent = "Delete";
    btnDel.onclick = async () => {
      if (!confirm("Delete this pet?")) return;
      showError("");
      try {
        await jsonFetch(`${getApi()}/pets/${pet.id}`, { method: "DELETE" });
        await loadPets();
      } catch (e) { showError(e.message); }
    };

    right.append(btnSave, btnDel);
    top.append(left, right);

    const mediaRow = document.createElement("div");
    mediaRow.className = "row";

    const imgBox = document.createElement("div");
    imgBox.className = "imgBox";

    const first = Array.isArray(pet.mediaUrls) ? pet.mediaUrls[0] : null;
    if (first) {
      const img = document.createElement("img");
      img.src = first; // should be SAS URL if blobs are private
      img.alt = "pet";
      img.onerror = () => console.log("image failed", first);
      imgBox.appendChild(img);
    } else {
      imgBox.textContent = "No image";
    }

    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";

    const btnUpload = document.createElement("button");
    btnUpload.textContent = "Upload & link image";
    btnUpload.onclick = async () => {
      showError("");
      if (!file.files || !file.files[0]) return showError("Pick a file first");
      try {
        // 1) Upload
        const fd = new FormData();
        fd.append("file", file.files[0]);

        const up = await jsonFetch(`${getApi()}/pets/${pet.id}/media`, {
          method: "POST",
          body: fd,
        });

        if (!up.sasUrl) throw new Error("Upload did not return sasUrl");

        // 2) Link (your backend should store sasUrl in mediaUrls)
        await jsonFetch(`${getApi()}/pets/${pet.id}/media/link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sasUrl: up.sasUrl }),
        });

        await loadPets();
      } catch (e) {
        showError(e.message);
      }
    };

    mediaRow.append(imgBox, file, btnUpload);

    card.append(top, mediaRow);

    if (Array.isArray(pet.mediaUrls) && pet.mediaUrls.length) {
      const urls = document.createElement("div");
      urls.className = "small";
      urls.textContent = `mediaUrls: ${pet.mediaUrls.join(" | ")}`;
      card.append(urls);
    }

    els.list.appendChild(card);
  }
}

els.saveApi.onclick = () => {
  setApi(els.apiBase.value);
  els.apiBase.value = getApi();
  loadPets();
};

els.refresh.onclick = loadPets;

els.create.onclick = async () => {
  showError("");
  try {
    const petName = els.petName.value.trim();
    const petType = els.petType.value.trim();
    if (!petName || !petType) return showError("Enter petName and petType");

    await jsonFetch(`${getApi()}/pets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petName, petType }),
    });

    els.petName.value = "";
    els.petType.value = "";
    await loadPets();
  } catch (e) {
    showError(e.message);
  }
};

loadPets();
