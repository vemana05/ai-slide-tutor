const API_BASE = "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function listFolders() {
  return request("/folders");
}

export function createFolder(name) {
  return request("/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function getFolder(id) {
  return request(`/folders/${id}`);
}

export function renameFolder(id, name) {
  return request(`/folders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function deleteFolder(id) {
  return request(`/folders/${id}`, { method: "DELETE" });
}

export function listSlideshows(folderId) {
  return request(`/folders/${folderId}/slideshows`);
}

export function uploadSlideshow(folderId, { title, files }) {
  const formData = new FormData();
  if (title) formData.append("title", title);
  for (const file of files) formData.append("files", file);

  return request(`/folders/${folderId}/slideshows`, {
    method: "POST",
    body: formData,
  });
}

export function getSlideshow(id) {
  return request(`/slideshows/${id}`);
}

export function deleteSlideshow(id) {
  return request(`/slideshows/${id}`, { method: "DELETE" });
}

export function updateOnboarding(slideshowId, { knowledgeLevel, contentDepth, timerEnabled }) {
  return request(`/slideshows/${slideshowId}/onboarding`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledge_level: knowledgeLevel,
      content_depth: contentDepth,
      timer_enabled: timerEnabled,
    }),
  });
}

export function getExplanation(slideId, knowledgeLevel, contentDepth) {
  const params = new URLSearchParams({
    knowledge_level: knowledgeLevel,
    content_depth: contentDepth,
  });
  return request(`/slides/${slideId}/explanation?${params}`);
}

export function getQuestions(slideId, knowledgeLevel, contentDepth) {
  const params = new URLSearchParams({
    knowledge_level: knowledgeLevel,
    content_depth: contentDepth,
  });
  return request(`/slides/${slideId}/questions?${params}`);
}

export function listSideQuestions(slideId) {
  return request(`/slides/${slideId}/side-questions`);
}

export function askSideQuestion(slideId, question, context) {
  return request(`/slides/${slideId}/side-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context: context || null }),
  });
}

export function listAnswers(slideId, knowledgeLevel, contentDepth) {
  const params = new URLSearchParams({
    knowledge_level: knowledgeLevel,
    content_depth: contentDepth,
  });
  return request(`/slides/${slideId}/answers?${params}`);
}

export function recordAnswer(slideId, { knowledgeLevel, contentDepth, questionIndex, givenAnswer, isCorrect }) {
  return request(`/slides/${slideId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledge_level: knowledgeLevel,
      content_depth: contentDepth,
      question_index: questionIndex,
      given_answer: givenAnswer,
      is_correct: isCorrect,
    }),
  });
}

export function getQuizSummary(slideshowId, knowledgeLevel, contentDepth) {
  const params = new URLSearchParams({
    knowledge_level: knowledgeLevel,
    content_depth: contentDepth,
  });
  return request(`/slideshows/${slideshowId}/quiz-summary?${params}`);
}

export function updateProgress(slideshowId, currentSlideIndex) {
  return request(`/slideshows/${slideshowId}/progress`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_slide_index: currentSlideIndex }),
  });
}

export function storageUrl(relativePath) {
  return `${API_BASE}/storage/${relativePath}`;
}
