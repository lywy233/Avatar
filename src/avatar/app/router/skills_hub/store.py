from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime

from .models import (
    SkillDetail,
    SkillFilterOption,
    SkillFilters,
    SkillListResponse,
    SkillRecord,
    SkillSummary,
)


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


SKILLS_POOL: tuple[SkillRecord, ...] = (
    SkillRecord(
        id="skill_prompt_optimizer",
        slug="prompt-optimizer",
        name="Prompt Optimizer",
        tagline="Refine prompts into clearer, more reliable instructions.",
        summary="Turns rough prompts into structured prompts with stronger constraints.",
        description=(
            "Prompt Optimizer helps operators turn loosely written instructions into "
            "clearer prompts with explicit goals, boundaries, and expected outputs. "
            "It is useful when a workflow depends on prompt quality but should still "
            "stay readable for human review."
        ),
        category="Authoring",
        tags=["prompting", "quality", "workflow"],
        difficulty="Intermediate",
        author="Avatar",
        version="0.1.0",
        is_featured=True,
        created_at=_dt("2026-04-10T09:00:00Z"),
        updated_at=_dt("2026-04-18T09:00:00Z"),
        use_cases=[
            "Rewrite a vague task into a structured agent prompt.",
            "Standardize prompts across repeated business workflows.",
        ],
    ),
    SkillRecord(
        id="skill_doc_summarizer",
        slug="document-summarizer",
        name="Document Summarizer",
        tagline="Extract concise takeaways from long-form material.",
        summary="Produces digestible summaries while preserving the important decisions.",
        description=(
            "Document Summarizer is designed for long reports, notes, and knowledge-base "
            "content. It focuses on preserving decision points, open questions, and action "
            "items instead of only shortening text."
        ),
        category="Knowledge",
        tags=["documents", "summary", "research"],
        difficulty="Beginner",
        author="Avatar",
        version="0.2.0",
        is_featured=True,
        created_at=_dt("2026-04-08T08:30:00Z"),
        updated_at=_dt("2026-04-17T10:45:00Z"),
        use_cases=[
            "Summarize meeting notes into action items.",
            "Create a quick brief from a long technical document.",
        ],
    ),
    SkillRecord(
        id="skill_web_researcher",
        slug="web-researcher",
        name="Web Researcher",
        tagline="Collect and organize signals from external web sources.",
        summary="Helps gather timely information across multiple sources for quick review.",
        description=(
            "Web Researcher supports lightweight external discovery workflows where the "
            "operator needs a structured shortlist of findings rather than raw search dumps. "
            "It is suited to trend scans, competitor snapshots, and sourcing tasks."
        ),
        category="Research",
        tags=["web", "search", "analysis"],
        difficulty="Intermediate",
        author="Avatar",
        version="0.1.2",
        is_featured=False,
        created_at=_dt("2026-04-09T11:00:00Z"),
        updated_at=_dt("2026-04-16T15:10:00Z"),
        use_cases=[
            "Prepare a market scan for a new product idea.",
            "Collect current references before drafting a recommendation.",
        ],
    ),
    SkillRecord(
        id="skill_release_notifier",
        slug="release-notifier",
        name="Release Notifier",
        tagline="Track release events and turn them into actionable updates.",
        summary="Surfaces version changes, highlights impact, and suggests follow-up actions.",
        description=(
            "Release Notifier watches for notable changes in tools or services and reshapes "
            "them into operational updates. It is helpful when teams need short, structured "
            "release notes without manually reading every changelog."
        ),
        category="Operations",
        tags=["release", "monitoring", "automation"],
        difficulty="Advanced",
        author="Avatar",
        version="0.3.0",
        is_featured=False,
        created_at=_dt("2026-04-07T07:20:00Z"),
        updated_at=_dt("2026-04-15T17:35:00Z"),
        use_cases=[
            "Summarize product release notes for an internal team.",
            "Highlight risky changes before a dependency upgrade.",
        ],
    ),
    SkillRecord(
        id="skill_meeting_brief_writer",
        slug="meeting-brief-writer",
        name="Meeting Brief Writer",
        tagline="Turn scattered meeting inputs into a clean execution brief.",
        summary="Converts goals, notes, and loose comments into a concise project brief.",
        description=(
            "Meeting Brief Writer is useful after discovery calls or internal syncs where "
            "the main challenge is moving from unstructured notes to a brief that the next "
            "owner can execute from immediately."
        ),
        category="Collaboration",
        tags=["meetings", "brief", "handoff"],
        difficulty="Beginner",
        author="Avatar",
        version="0.1.1",
        is_featured=True,
        created_at=_dt("2026-04-11T13:00:00Z"),
        updated_at=_dt("2026-04-18T08:10:00Z"),
        use_cases=[
            "Turn workshop notes into a delivery brief.",
            "Create a clean handoff after a stakeholder meeting.",
        ],
    ),
    SkillRecord(
        id="skill_dataset_label_helper",
        slug="dataset-label-helper",
        name="Dataset Label Helper",
        tagline="Support structured tagging and labeling workflows.",
        summary="Provides clearer category guidance and consistency for manual labeling tasks.",
        description=(
            "Dataset Label Helper helps teams keep labeling runs consistent by clarifying the "
            "meaning of categories, edge cases, and common misclassifications. It works best "
            "when paired with human review workflows."
        ),
        category="Operations",
        tags=["data", "labeling", "quality"],
        difficulty="Advanced",
        author="Avatar",
        version="0.4.0",
        is_featured=False,
        created_at=_dt("2026-04-05T09:45:00Z"),
        updated_at=_dt("2026-04-14T12:25:00Z"),
        use_cases=[
            "Support annotation teams with clearer labeling rules.",
            "Document edge cases before a new labeling batch starts.",
        ],
    ),
)


def _to_summary(skill: SkillRecord) -> SkillSummary:
    return SkillSummary(
        id=skill.id,
        slug=skill.slug,
        name=skill.name,
        tagline=skill.tagline,
        summary=skill.summary,
        category=skill.category,
        tags=list(skill.tags),
        difficulty=skill.difficulty,
        author=skill.author,
        version=skill.version,
        is_featured=skill.is_featured,
        updated_at=skill.updated_at,
    )


def _to_detail(skill: SkillRecord) -> SkillDetail:
    return SkillDetail(
        **_to_summary(skill).model_dump(),
        description=skill.description,
        created_at=skill.created_at,
        use_cases=list(skill.use_cases),
    )


def _normalize(value: str | None) -> str:
    return (value or "").strip().lower()


def _matches(skill: SkillRecord, q: str | None, category: str | None, tag: str | None, difficulty: str | None) -> bool:
    normalized_query = _normalize(q)
    normalized_category = _normalize(category)
    normalized_tag = _normalize(tag)
    normalized_difficulty = _normalize(difficulty)

    if normalized_query:
        haystack = " ".join(
            [
                skill.name,
                skill.tagline,
                skill.summary,
                skill.description,
                skill.category,
                skill.author,
                *skill.tags,
                *skill.use_cases,
            ],
        ).lower()
        if normalized_query not in haystack:
            return False

    if normalized_category and skill.category.lower() != normalized_category:
        return False
    if normalized_difficulty and skill.difficulty.lower() != normalized_difficulty:
        return False
    if normalized_tag and normalized_tag not in {item.lower() for item in skill.tags}:
        return False

    return True


def _build_filter_options(values: Counter[str]) -> list[SkillFilterOption]:
    return [
        SkillFilterOption(value=value, label=value, count=count)
        for value, count in sorted(values.items(), key=lambda item: (item[0].lower(), item[1]))
    ]


def _build_filters(skills: list[SkillRecord]) -> SkillFilters:
    categories = Counter(skill.category for skill in skills)
    difficulties = Counter(skill.difficulty for skill in skills)
    tags = Counter(tag for skill in skills for tag in skill.tags)
    return SkillFilters(
        categories=_build_filter_options(categories),
        difficulties=_build_filter_options(difficulties),
        tags=_build_filter_options(tags),
    )


def list_skills(
    *,
    q: str | None = None,
    category: str | None = None,
    tag: str | None = None,
    difficulty: str | None = None,
) -> SkillListResponse:
    filtered = [
        skill
        for skill in SKILLS_POOL
        if _matches(skill, q=q, category=category, tag=tag, difficulty=difficulty)
    ]
    filtered.sort(key=lambda skill: (not skill.is_featured, skill.name.lower()))
    return SkillListResponse(
        items=[_to_summary(skill) for skill in filtered],
        total=len(filtered),
        filters=_build_filters(list(SKILLS_POOL)),
    )


def get_skill_by_slug(slug: str) -> SkillDetail | None:
    normalized_slug = slug.strip().lower()
    for skill in SKILLS_POOL:
        if skill.slug.lower() == normalized_slug:
            return _to_detail(skill)
    return None
