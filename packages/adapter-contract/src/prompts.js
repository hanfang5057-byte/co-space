import { RULES_ZH } from '../../agent-contract/src/index.js';

/** Canonical agent prompts shared by host integrations and the local review UI. */
export function autonomousReviewPrompt(documentReference) {
  return `请通过 CoSpace MCP 读取文档引用 ${documentReference}，仅根据已接受的正文自主审阅并提交具体修改建议。此操作不是按评论修改：不要把评论当作修改指令，不要处理或完成评论，也不要把审阅范围扩展到评论要求之外。${RULES_ZH.decisions}`;
}

export function commentProcessingPrompt(documentReference, commentIds) {
  const ids = [...new Set(commentIds)];
  return `${documentReference}\n请通过 CoSpace MCP 按评论提出修改建议，只处理以下评论 ID：${ids.join('、')}。先读取正文和这些评论的引用文本、锚点及正文；如果可用可按需使用大纲、分段及评论列表，否则调用 space_document_read；逐条理解评论，并对每条明确且可定位的修改要求提交对应的具体建议。每条建议都填写不超过 200 字的简短 explanation，说明修改理由；author 填写当前 Agent 类型（workbuddy、claude、codex、deepseek、glm），无法匹配时填 agent。不要只复述或分类评论，也不要在评论要求之外自主审阅或增加建议。评论含糊或无法安全定位时，说明原因并询问，不要猜测。通过建议成功关联的评论无需重复关联；否则调用 space_comment_complete，为已处理评论关联对应建议 ID；未处理的评论传空 suggestionIds，使其保持待处理。${RULES_ZH.decisions}`;
}
