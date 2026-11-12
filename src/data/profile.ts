import type { Lang, Localized } from '@/i18n/types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Skill {
  readonly name: string;
  /** Years of hands-on use. Shown next to the name from two years up. */
  readonly years: number;
}

export interface SkillGroup {
  readonly id: string;
  readonly label: Localized;
  readonly items: readonly Skill[];
}

export interface ExperienceItem {
  readonly id: string;
  readonly role: Localized;
  readonly company: string;
  /** One line about the company or the product: industry, size. */
  readonly context: Localized;
  readonly startYear: number;
  /** null = present */
  readonly endYear: number | null;
  readonly highlights: readonly Localized[];
  readonly stack: readonly string[];
}

/** A number with a caption, e.g. "120 ms" + "p95 from event to pixel". */
export interface Metric {
  readonly value: string;
  readonly label: Localized;
}

/** Built-in wireframe drawn for a featured project when there is no screenshot. */
export type ProjectVisualKind = 'dashboard' | 'components' | 'map' | 'generic';

/** A featured project: shown large, with a visual and three metrics. */
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly year: number;
  /** What kind of work it was, e.g. "Open source". */
  readonly type: Localized;
  readonly role: Localized;
  readonly description: Localized;
  readonly metrics: readonly Metric[];
  readonly tech: readonly string[];
  /** Public address of the product. Leave out when there is none. */
  readonly demoUrl?: string;
  /** The running application, when its address is public. It opens on a sign-in page. */
  readonly appUrl?: string;
  /** Public repository. Leave out for company work: the card then says the source is private. */
  readonly repoUrl?: string;
  /** Which built-in wireframe to draw (default: 'generic'). Ignored when `image` is set. */
  readonly visual?: ProjectVisualKind;
  /** A real screenshot in /public (16:9 works best). Replaces the wireframe. */
  readonly image?: {
    readonly src: string;
    readonly width: number;
    readonly height: number;
    readonly alt: Localized;
  };
}

/** A smaller project: one row in the "More work" table. */
export interface ArchiveItem {
  readonly id: string;
  readonly year: number;
  readonly name: string;
  readonly description: Localized;
  readonly tech: readonly string[];
  /** Leave out when there is nothing public to link to. */
  readonly url?: string;
}

export interface WritingItem {
  readonly id: string;
  readonly kind: 'article' | 'talk';
  readonly title: Localized;
  /** Where it was published or presented. */
  readonly venue: string;
  /** Year and month, as "YYYY-MM". */
  readonly date: string;
  /** Reading time for an article, length for a talk. */
  readonly minutes: number;
  readonly url: string;
}

/**
 * Feedback from a colleague. With a `name` it is shown as a quotation, so the text must be
 * that person's own words, used with their consent. Without a name it is shown as a summary.
 */
export interface Testimonial {
  readonly id: string;
  readonly quote: Localized;
  readonly name?: string;
  /** Who said it: a job title, or a group such as "Teammates". */
  readonly role: Localized;
  /** The company, or where those people worked with me. */
  readonly where: Localized;
}

export interface Credential {
  readonly id: string;
  /** A year or a range, e.g. "2016 – 2020". */
  readonly period: string;
  readonly title: Localized;
  readonly issuer: Localized;
}

/** A label and a value: one row of a "spec sheet". */
export interface Fact {
  readonly id: string;
  readonly label: Localized;
  readonly value: Localized;
}

export interface Principle {
  readonly id: string;
  readonly title: Localized;
  readonly body: Localized;
}

/** A headline number shown under the hero. Rendered as prefix + value + suffix. */
export interface Stat {
  readonly id: string;
  readonly value: number;
  /** Digits after the decimal point (default 0). */
  readonly decimals?: number;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly label: Localized;
  /** Where the number comes from (a company or a project). */
  readonly source: string;
  /** How the number moved over time, oldest first. Drawn as a small line chart when given. */
  readonly trend?: readonly number[];
}

export interface SocialLink {
  readonly id: 'github' | 'gitlab' | 'linkedin';
  readonly label: string;
  readonly url: string;
  /** Short handle shown next to the icon. */
  readonly handle: string;
}

/** How the work is done with AI agents: the highlighted block of the About section. */
export interface AiWorkflow {
  /** Short label of the badge next to the job title in the hero. */
  readonly badge: Localized;
  readonly kicker: Localized;
  readonly title: Localized;
  readonly lead: Localized;
  /** The process, in order. Four read best. */
  readonly steps: readonly Principle[];
  /** Three numbers that back it up. */
  readonly facts: readonly Metric[];
  /** The checks between an AI draft and production, as a short list. */
  /** Heading of the row of tools; the tools are the items of the `ai` skill group. */
  readonly toolkitTitle: Localized;
  readonly guardrailsTitle: Localized;
  readonly guardrails: readonly Localized[];
}

export interface Profile {
  /**
   * Fallback public URL (no trailing slash) for canonical / Open Graph / sitemap.
   * Overridden at build time by SITE_URL or the Vercel production domain.
   */
  readonly siteUrl: string;
  readonly name: string;
  /** The word of `name` people call you by. The hero sets it in the accent typeface. */
  readonly givenName: string;
  readonly title: Localized;
  readonly location: Localized;
  /** Shown as a small readout under the hero visual. Purely decorative. */
  readonly coordinates: string;
  /** One sentence: what you do. Also used for link previews. */
  readonly tagline: Localized;
  /**
   * Shown as a status chip in the hero, the status bar and the contact card.
   * Set `open: false` to hide it everywhere. `details` are the rows in the contact card.
   */
  readonly availability: {
    readonly open: boolean;
    readonly label: Localized;
    readonly details: readonly Fact[];
  };
  /** Short phrases typed one after another in the hero, and listed in the "code" card. */
  readonly focus: Localized<readonly string[]>;
  /** IANA time zone, used for the live local time. */
  readonly timeZone: string;
  /** The first paragraph is set larger, as a lead. */
  readonly about: readonly Localized[];
  readonly principles: readonly Principle[];
  readonly ai: AiWorkflow;
  readonly email: string;
  /** Short invitation shown above the contact details. */
  readonly contactNote: Localized;
  readonly socials: readonly SocialLink[];
  readonly stats: readonly Stat[];
  readonly cv: Localized;
  /** The summary at the top of the CV: third-person-free, denser than the About text of the page. */
  readonly cvSummary: Localized;
  readonly avatar: { readonly src: string; readonly width: number; readonly height: number };
  readonly skills: readonly SkillGroup[];
  /** Things being learned right now. Listed after the skill groups. Leave empty to hide. */
  readonly exploring: readonly string[];
  readonly experience: readonly ExperienceItem[];
  /** Education and awards, listed under the experience. Leave empty to hide. */
  readonly credentials: readonly Credential[];
  readonly projects: readonly Project[];
  /** Smaller projects, listed as a table. Leave empty to hide. */
  readonly archive: readonly ArchiveItem[];
  /** Articles and talks. Leave empty to hide the section and its navigation link. */
  readonly writing: readonly WritingItem[];
  /** Quotes from colleagues. Leave empty to hide. */
  readonly testimonials: readonly Testimonial[];
  readonly seo: {
    readonly title: Localized;
    readonly description: Localized;
    readonly ogLabel: Localized;
    readonly keywords: Localized<readonly string[]>;
  };
}

/* ------------------------------------------------------------------ */
/* Data: edit freely, components never hard-code copy                  */
/*                                                                     */
/* Where the facts come from:                                          */
/*  - Jobs before 2025, education and awards: the CV.                  */
/*  - Onflow numbers (commits, files, tests, modules): counted from    */
/*    the repositories in November 2026.                               */
/*  - What the Onflow products are and do: the public pages on         */
/*    onflow.vn (OMS, Fulfillment Connect). Nothing else about the     */
/*    company is taken from the repositories.                          */
/*  - What GBST's products are: the public pages on gbst.com.           */
/*  - Job title and total years: confirmed by the owner.               */
/*  - Outcomes at Onflow (release time halved, deploys from 8 minutes  */
/*    to just over 3, hotfixes down to one or two): stated by the      */
/*    owner, not measured from the repositories.                       */
/*  - The share of AI-written code (about 80%): the owner's own        */
/*    estimate. The agent guides (AGENTS.md, CLAUDE.md) are in three   */
/*    of the Onflow repositories, added by the owner in 2026.          */
/*  - Fulfillment Connect, seven weeks to production: first commit   */
/*    12 May 2026, production deployment 30 June 2026 (git dates,     */
/*    confirmed by the owner).                                        */
/*  - Skill years, the availability rows and "exploring" are           */
/*    estimates: adjust them to taste.                                 */
/* ------------------------------------------------------------------ */

export const profile: Profile = {
  siteUrl: 'https://kiet-nguyen-dev.vercel.app',
  name: 'Kiệt Nguyễn',
  givenName: 'Kiệt',
  title: { en: 'Senior Frontend Developer', vi: 'Senior Frontend Developer' },
  location: { en: 'Ho Chi Minh City, Vietnam', vi: 'TP. Hồ Chí Minh, Việt Nam' },
  coordinates: '10.7769° N, 106.7009° E',
  tagline: {
    en: 'I build the web apps that keep e-commerce orders moving.',
    vi: 'Tôi xây dựng những ứng dụng web giữ cho dòng đơn hàng thương mại điện tử luôn thông suốt.',
  },
  availability: {
    open: true,
    label: { en: 'Open to collaboration', vi: 'Sẵn sàng hợp tác' },
    details: [
      {
        id: 'roles',
        label: { en: 'Good fit', vi: 'Phù hợp' },
        value: { en: 'Frontend and full-stack product work', vi: 'Dự án frontend và full-stack' },
      },
      {
        id: 'mode',
        label: { en: 'Work mode', vi: 'Hình thức' },
        value: { en: 'Remote, or on site in Ho Chi Minh City', vi: 'Remote, hoặc tại TP. Hồ Chí Minh' },
      },
      {
        id: 'reply',
        label: { en: 'Reply time', vi: 'Phản hồi' },
        value: { en: 'Usually within a day', vi: 'Thường trong vòng một ngày' },
      },
    ],
  },
  focus: {
    en: [
      'AI-assisted development with guardrails',
      'order management systems',
      'TypeScript at scale',
      'shared component libraries',
    ],
    vi: [
      'phát triển cùng AI có kiểm soát',
      'hệ thống quản lý đơn hàng',
      'TypeScript quy mô lớn',
      'thư viện component dùng chung',
    ],
  },
  timeZone: 'Asia/Ho_Chi_Minh',
  about: [
    {
      en: "I'm a senior frontend developer based in Ho Chi Minh City. For more than six years I've built production web apps with React and TypeScript: e-commerce storefronts, GBST's wealth-management software for the UK market and, today, the platform behind Onflow Fulfillment.",
      vi: 'Tôi là senior frontend developer tại TP. Hồ Chí Minh. Hơn sáu năm qua, tôi xây dựng các ứng dụng web chạy thực tế bằng React và TypeScript: từ website thương mại điện tử, phần mềm quản lý tài sản của GBST cho thị trường Anh, đến nền tảng công nghệ của Onflow Fulfillment hiện nay.',
    },
    {
      en: "At Onflow I'm the primary frontend developer of the OMS that multichannel sellers use to run products, orders, inbound stock and returns across their sales channels. After taking over the codebase I restructured it into feature-based modules, redesigned its UI/UX, migrated it to strict TypeScript and wrote most of its test suite. I also built the Fulfillment Connect console and the shared frontend library from scratch.",
      vi: 'Tại Onflow, tôi là người phát triển chính frontend của hệ thống OMS mà nhà bán hàng đa kênh dùng để quản lý sản phẩm, đơn hàng, nhập kho và hoàn trả trên mọi kênh bán. Sau khi tiếp nhận codebase, tôi tái cấu trúc theo hướng feature-based, thiết kế lại UI/UX, chuyển toàn bộ sang TypeScript strict và viết phần lớn bộ test. Tôi cũng xây dựng từ đầu giao diện Fulfillment Connect và thư viện frontend dùng chung.',
    },
    {
      en: "I like codebases that explain themselves: typed data layers, rules enforced by lint instead of by memory, and documentation that both people and coding agents can follow. That is what lets me work AI-first: about 80% of the code I ship starts with an AI coding agent, and I plan, review and own all of it. When a feature needs it, I'm comfortable on the backend too, with NestJS, Strapi and SQL.",
      vi: 'Tôi thích những codebase tự giải thích được chính nó: data layer có type, quy tắc do lint kiểm tra thay vì dựa vào trí nhớ, và tài liệu mà cả con người lẫn AI coding agent đều làm theo được. Đó cũng là nền để tôi làm việc theo hướng AI-first: khoảng 80% code tôi đưa lên production bắt đầu từ AI coding agent, còn tôi lên kế hoạch, review và chịu trách nhiệm cho toàn bộ. Khi tính năng cần, tôi cũng làm được backend với NestJS, Strapi và SQL.',
    },
  ],
  principles: [
    {
      id: 'types',
      title: { en: 'Types before features', vi: 'Type trước, tính năng sau' },
      body: {
        en: 'Strict TypeScript end to end. I moved a large app off JavaScript and typed its data layer one domain at a time.',
        vi: 'TypeScript strict từ đầu đến cuối. Tôi đã đưa một ứng dụng lớn rời khỏi JavaScript và thêm type cho data layer theo từng domain.',
      },
    },
    {
      id: 'rules',
      title: { en: 'Rules as code', vi: 'Quy tắc viết thành code' },
      body: {
        en: 'Import direction, query keys, i18n and permissions are checked by lint scripts in CI, not by a reviewer who has to remember them.',
        vi: 'Chiều import, query key, i18n và phân quyền đều do lint script kiểm tra trong CI, không dựa vào trí nhớ của người review.',
      },
    },
    {
      id: 'tests',
      title: { en: 'Tests next to the code', vi: 'Test nằm cạnh code' },
      body: {
        en: 'Vitest and Testing Library live beside each module, so a refactor shows what it broke within minutes.',
        vi: 'Vitest và Testing Library nằm ngay cạnh từng module, nên mỗi lần refactor đều biết hỏng gì chỉ sau vài phút.',
      },
    },
    {
      id: 'docs',
      title: { en: 'Docs for people and agents', vi: 'Tài liệu cho người và agent' },
      body: {
        en: 'One accurate guide per repository, so a new teammate and an AI agent follow the same rules.',
        vi: 'Mỗi repository có một bản hướng dẫn chính xác, để đồng nghiệp mới và AI agent cùng làm theo một bộ quy tắc.',
      },
    },
  ],
  ai: {
    badge: { en: 'AI-native Developer', vi: 'AI-native Developer' },
    kicker: { en: 'How I work with AI', vi: 'Cách tôi làm việc với AI' },
    title: { en: 'AI-assisted development, with guardrails', vi: 'Phát triển cùng AI, có kiểm soát' },
    lead: {
      en: 'Most of my code now starts with an AI agent. What makes it safe to ship is everything around the agent: a written spec, rules it cannot skip, and a human who reads every diff.',
      vi: 'Phần lớn code của tôi hiện bắt đầu từ AI agent. Điều giúp nó đủ an toàn để đưa lên production là mọi thứ quanh agent: yêu cầu viết rõ ràng, những quy tắc agent không thể bỏ qua, và một người đọc từng diff.',
    },
    steps: [
      {
        id: 'spec',
        title: { en: 'Spec first', vi: 'Spec trước' },
        body: {
          en: 'I write down what to build and how it will be checked before the agent writes a line.',
          vi: 'Tôi viết rõ cần làm gì và sẽ kiểm tra thế nào trước khi agent viết dòng code đầu tiên.',
        },
      },
      {
        id: 'rules',
        title: { en: 'Rules and skills', vi: 'Rule và skill' },
        body: {
          en: 'Each repository carries an agent guide, lint rules and reusable skills, so the agent works the way the team does.',
          vi: 'Mỗi repository có bản hướng dẫn cho agent, bộ lint rule và các skill dùng lại, để agent làm việc đúng cách của team.',
        },
      },
      {
        id: 'draft',
        title: { en: 'The agent drafts', vi: 'Agent viết nháp' },
        body: {
          en: 'The agent writes the code and its tests in small steps. Subagents search, review and verify, each on a model sized for the task, which saves tokens.',
          vi: 'Agent viết code và test đi kèm theo từng bước nhỏ. Subagent lo việc tìm mã, review và kiểm tra, mỗi việc dùng model vừa đủ để tiết kiệm token.',
        },
      },
      {
        id: 'review',
        title: { en: 'I review, CI decides', vi: 'Tôi review, CI quyết định' },
        body: {
          en: 'I read every diff and own the result. Nothing merges until types, lint and tests pass.',
          vi: 'Tôi đọc từng diff và chịu trách nhiệm về kết quả. Không gì được merge khi type, lint và test chưa đạt.',
        },
      },
    ],
    facts: [
      { value: '≈80%', label: { en: 'of my code is drafted by AI', vi: 'code do AI viết nháp' } },
      { value: '100%', label: { en: 'of diffs reviewed by me', vi: 'diff do tôi review' } },
      {
        value: '3',
        label: { en: 'repositories with agent guides', vi: 'repository có hướng dẫn cho agent' },
      },
    ],
    toolkitTitle: { en: 'Agent toolkit', vi: 'Bộ công cụ agent' },
    guardrailsTitle: { en: 'What keeps it under control', vi: 'Điều giữ mọi thứ trong tầm kiểm soát' },
    guardrails: [
      { en: 'Strict TypeScript, no JavaScript left', vi: 'TypeScript strict, không còn JavaScript' },
      { en: 'Architecture rules checked by lint in CI', vi: 'Quy tắc kiến trúc do lint kiểm tra trong CI' },
      {
        en: 'Tests run on every pull request: 800+ files across three codebases',
        vi: 'Test chạy trên mỗi pull request: hơn 800 file ở ba codebase',
      },
      {
        en: 'Agent guides and skills in the repository',
        vi: 'Hướng dẫn và skill cho agent nằm trong repository',
      },
      { en: 'A human reads every diff before it merges', vi: 'Mọi diff đều có người đọc trước khi merge' },
    ],
  },
  email: 'kiet080797@gmail.com',
  contactNote: {
    en: "Have a product to build or a codebase to untangle? I'd love to hear about it.",
    vi: 'Bạn có sản phẩm cần xây dựng hoặc một codebase cần gỡ rối? Tôi rất sẵn lòng trao đổi.',
  },
  socials: [
    {
      id: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/kiet-nguyen-dev',
      handle: 'linkedin.com/in/kiet-nguyen-dev',
    },
    { id: 'github', label: 'GitHub', url: 'https://github.com/kiet0807', handle: 'github.com/kiet0807' },
  ],
  stats: [
    {
      id: 'years',
      value: 6,
      suffix: '+',
      label: { en: 'years building production frontends', vi: 'năm xây dựng frontend cho sản phẩm thực tế' },
      source: '2020 – 2026',
      // Years since the first role, at the end of each calendar year.
      trend: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.4],
    },
    {
      id: 'release',
      value: 50,
      suffix: '%',
      label: {
        en: 'shorter release cycle on the Onflow frontends',
        vi: 'chu kỳ release rút ngắn trên các frontend Onflow',
      },
      source: 'Onflow',
    },
    {
      id: 'migration',
      value: 1.6,
      decimals: 1,
      suffix: 'k',
      label: {
        en: 'files migrated to strict TypeScript, zero JavaScript left',
        vi: 'file chuyển sang TypeScript strict, không còn JavaScript',
      },
      source: 'Onflow OMS',
    },
    {
      id: 'tests',
      value: 800,
      suffix: '+',
      label: {
        en: 'test files guarding three production codebases',
        vi: 'file test bảo vệ ba codebase production',
      },
      source: 'Onflow',
      // Running total per month, May to November 2026.
      trend: [11, 54, 104, 212, 323, 725, 817],
    },
  ],
  cv: { en: '/cv-en.pdf', vi: '/cv-vi.pdf' },
  cvSummary: {
    en: "Senior frontend developer with 6+ years of experience building production web applications in React and TypeScript, across e-commerce, UK wealth-management software and fulfillment platforms. Primary frontend developer of Onflow's order management system: restructured the codebase, redesigned the UI/UX, migrated it to strict TypeScript and helped cut the release cycle by 50%; built Fulfillment Connect and the shared packages from scratch. Works AI-first with guardrails: about 80% of the code is drafted by AI agents, and every change is specified, reviewed and tested before it ships.",
    vi: 'Senior Frontend Developer với hơn 6 năm kinh nghiệm xây dựng ứng dụng web production bằng React và TypeScript trong các lĩnh vực thương mại điện tử, quản lý tài sản (thị trường Anh) và fulfillment. Người phát triển chính frontend hệ thống quản lý đơn hàng của Onflow: tái cấu trúc codebase, thiết kế lại UI/UX, chuyển đổi sang TypeScript strict và góp phần rút ngắn 50% chu kỳ release; xây dựng từ đầu Fulfillment Connect và bộ package dùng chung. Làm việc theo hướng AI-first có kiểm soát: khoảng 80% code do AI agent viết nháp, mọi thay đổi đều có đặc tả, được review và kiểm thử trước khi phát hành.',
  },
  avatar: { src: '/avatar.webp', width: 512, height: 512 },
  skills: [
    {
      id: 'core',
      label: { en: 'Core', vi: 'Nền tảng' },
      items: [
        { name: 'React', years: 6 },
        { name: 'TypeScript', years: 6 },
        { name: 'JavaScript', years: 6 },
        { name: 'HTML', years: 6 },
        { name: 'CSS / Sass', years: 6 },
      ],
    },
    {
      id: 'framework',
      label: { en: 'Frameworks & state', vi: 'Framework & state' },
      items: [
        { name: 'Next.js', years: 3 },
        { name: 'TanStack Query', years: 3 },
        { name: 'React Hook Form', years: 2 },
        { name: 'React Router', years: 3 },
        { name: 'Zustand', years: 1 },
        { name: 'Ember.js', years: 1 },
      ],
    },
    {
      id: 'ui',
      label: { en: 'UI & styling', vi: 'UI & styling' },
      items: [
        { name: 'Bootstrap / reactstrap', years: 3 },
        { name: 'Material UI', years: 1 },
        { name: 'Recharts', years: 2 },
        { name: 'react-i18next', years: 2 },
      ],
    },
    {
      id: 'testing',
      label: { en: 'Testing & tooling', vi: 'Testing & tooling' },
      items: [
        { name: 'Vitest', years: 2 },
        { name: 'Jest', years: 1 },
        { name: 'React Testing Library', years: 3 },
        { name: 'Vite', years: 2 },
        { name: 'ESLint', years: 3 },
        { name: 'GitHub Actions', years: 2 },
        { name: 'Google Apps Script', years: 1 },
      ],
    },
    {
      id: 'backend',
      label: { en: 'Backend & data', vi: 'Backend & dữ liệu' },
      items: [
        { name: 'Node.js (NestJS, Express)', years: 1 },
        { name: 'Strapi', years: 1 },
        { name: 'REST', years: 6 },
        { name: 'GraphQL', years: 1 },
        { name: 'PostgreSQL / MySQL', years: 1 },
        { name: 'MongoDB', years: 1 },
        { name: 'Docker', years: 2 },
      ],
    },
    {
      // Shown with the violet AI accent (Skills.tsx looks for this id).
      id: 'ai',
      label: { en: 'AI & agents', vi: 'AI & agent' },
      items: [
        { name: 'Claude Code', years: 1 },
        { name: 'Agent Skills', years: 1 },
        { name: 'Subagents', years: 1 },
        { name: 'Hooks', years: 1 },
        { name: 'AGENTS.md / CLAUDE.md', years: 1 },
        { name: 'Model routing', years: 1 },
        { name: 'Token optimization', years: 1 },
        { name: 'MCP', years: 1 },
      ],
    },
  ],
  exploring: [
    'Claude Certified Architect',
    'Prompt caching',
    'React 19',
    'Tailwind CSS 4',
    'React Three Fiber',
    'Turborepo',
  ],
  experience: [
    {
      id: 'onflow',
      role: { en: 'Senior Frontend Developer', vi: 'Senior Frontend Developer' },
      company: 'Onflow Fulfillment',
      context: {
        en: 'E-commerce fulfillment service built on its own technology platform: OMS, WMS, TMS and Fulfillment Connect.',
        vi: 'Dịch vụ fulfillment thương mại điện tử dựa trên nền tảng công nghệ riêng: OMS, WMS, TMS và Fulfillment Connect.',
      },
      startYear: 2025,
      endYear: null,
      highlights: [
        {
          en: 'Took over the Onflow OMS frontend as primary developer (3,700+ commits): restructured it into seven feature-based modules, redesigned the UI/UX and migrated 1,600+ files to strict TypeScript.',
          vi: 'Tiếp nhận và là người phát triển chính frontend Onflow OMS (hơn 3.700 commit): tái cấu trúc codebase thành bảy module theo hướng feature-based, thiết kế lại UI/UX và chuyển đổi hơn 1.600 file từ JavaScript sang TypeScript strict.',
        },
        {
          en: 'Moved the OMS build from Create React App to Vite and upgraded its core dependencies for faster builds and deployments; authored most of the test suite and the architecture lint rules.',
          vi: 'Chuyển build của OMS từ Create React App sang Vite và nâng cấp các dependency cốt lõi để build và deploy nhanh hơn; xây dựng phần lớn bộ test và các quy tắc lint kiến trúc.',
        },
        {
          en: 'Built the Fulfillment Connect console from an empty repository to production in seven weeks (nine feature modules today), then created Onflow Shared Packages: the UI, API runtime and tooling both apps share.',
          vi: 'Xây dựng giao diện Fulfillment Connect từ repository trống tới production trong bảy tuần (hiện có chín module), sau đó tạo Onflow Shared Packages: bộ UI, API runtime và tooling dùng chung cho hai ứng dụng.',
        },
        {
          en: 'Delivered inbound, outbound, courier and reporting screens for the Operations System (OPS) and built two internal Google Apps Script tools: a warehouse inbound booking form and a Taiga-to-Sheets sync.',
          vi: 'Phát triển các màn hình nhập kho, xuất kho, vận chuyển và báo cáo cho hệ thống vận hành OPS; xây dựng hai công cụ nội bộ bằng Google Apps Script: form đặt lịch nhập kho và công cụ đồng bộ Taiga với Google Sheets.',
        },
        {
          en: 'Established an AI-assisted workflow: authored the agent guides (AGENTS.md, CLAUDE.md) in three repositories and built 7 reusable skills, 3 subagents and session hooks, matching the model to each task to save tokens; about 80% of the code is drafted by AI agents and 100% is reviewed before merge.',
          vi: 'Thiết lập quy trình phát triển có AI hỗ trợ: soạn bản hướng dẫn cho agent (AGENTS.md, CLAUDE.md) trong ba repository, xây dựng 7 skill dùng lại, 3 subagent và hook, chọn model theo từng tác vụ để tiết kiệm token; khoảng 80% code do AI agent viết nháp và 100% được review trước khi merge.',
        },
        {
          en: 'Impact: release cycle 50% shorter, deployments over 50% faster, production hotfixes nearly eliminated.',
          vi: 'Kết quả: rút ngắn 50% chu kỳ release, giảm hơn 50% thời gian deploy và gần như loại bỏ hotfix trên production.',
        },
      ],
      stack: ['React', 'TypeScript', 'Vite', 'TanStack Query', 'Vitest', 'Sentry'],
    },
    {
      id: 'freelance',
      role: { en: 'Full-stack Developer', vi: 'Full-stack Developer' },
      company: 'Freelance',
      context: {
        en: 'Company website for Diamond Owl Solution, an IT services firm.',
        vi: 'Website doanh nghiệp cho Diamond Owl Solution, công ty dịch vụ công nghệ.',
      },
      startYear: 2024,
      endYear: 2024,
      highlights: [
        {
          en: 'Designed and built the website end to end with Next.js on a headless Strapi CMS.',
          vi: 'Thiết kế và xây dựng toàn bộ website bằng Next.js trên nền headless CMS Strapi.',
        },
        {
          en: 'Modeled the content, exposed it through a GraphQL API and integrated email and third-party services.',
          vi: 'Thiết kế mô hình dữ liệu nội dung, cung cấp qua GraphQL API và tích hợp email cùng các dịch vụ bên thứ ba.',
        },
        {
          en: "Containerized the stack with Docker for portable deployment on the client's infrastructure.",
          vi: 'Đóng gói hệ thống bằng Docker, giúp khách hàng triển khai linh hoạt trên hạ tầng riêng.',
        },
        {
          en: 'Worked in a three-person team, turning requirements from the team lead and the client into features.',
          vi: 'Phối hợp trong nhóm ba người, chuyển yêu cầu từ team leader và khách hàng thành tính năng hoàn chỉnh.',
        },
      ],
      stack: ['Next.js', 'TypeScript', 'Strapi', 'GraphQL', 'Docker'],
    },
    {
      id: 'tma',
      role: { en: 'Frontend Developer', vi: 'Frontend Developer' },
      company: 'TMA Solutions × GBST',
      context: {
        en: 'GBST builds wealth-management software for investment platforms and pension providers. Contributed to two of its products: Composer and Catalyst.',
        vi: 'GBST phát triển phần mềm quản lý tài sản cho các nền tảng đầu tư và quỹ hưu trí. Tham gia hai sản phẩm: Composer và Catalyst.',
      },
      startYear: 2022,
      endYear: 2024,
      highlights: [
        {
          en: "Developed React features for Composer, the wealth administration platform behind some of the UK's largest investment platforms.",
          vi: 'Phát triển tính năng bằng React cho Composer, nền tảng quản trị tài sản đứng sau nhiều nền tảng đầu tư lớn tại Anh.',
        },
        {
          en: 'Delivered new React features for Catalyst, a self-service digital portal for investors and advisers, alongside its legacy Ember.js application.',
          vi: 'Phát triển tính năng mới bằng React cho Catalyst, cổng thông tin tự phục vụ dành cho nhà đầu tư và cố vấn tài chính, song song với ứng dụng Ember.js hiện hữu.',
        },
        {
          en: 'Worked in an Agile Scrum team, communicating directly with the overseas client to refine requirements; covered new features with Jest and Testing Library tests.',
          vi: 'Làm việc theo mô hình Agile Scrum, trao đổi trực tiếp với khách hàng nước ngoài để làm rõ yêu cầu; viết test cho tính năng mới bằng Jest và Testing Library.',
        },
        {
          en: 'Recognized twice: for delivering a release ahead of schedule, and for high performance and support of colleagues.',
          vi: 'Hai lần được ghi nhận: hoàn thành release trước thời hạn; đạt hiệu suất cao và tích cực hỗ trợ đồng nghiệp.',
        },
      ],
      stack: ['React', 'Ember.js', 'Jest', 'Formik', 'Jenkins'],
    },
    {
      id: 'pavn',
      role: { en: 'Frontend Developer', vi: 'Frontend Developer' },
      company: 'PAVN',
      context: {
        en: 'Online marketplace for buying and selling digital services.',
        vi: 'Sàn giao dịch trực tuyến cho các dịch vụ số.',
      },
      startYear: 2021,
      endYear: 2021,
      highlights: [
        {
          en: 'Built the storefront with Next.js and TypeScript, using server-side rendering for performance and SEO.',
          vi: 'Xây dựng storefront bằng Next.js và TypeScript, áp dụng server-side rendering để tối ưu tốc độ và SEO.',
        },
        {
          en: 'Managed server state with React Query and built the interface with Material UI.',
          vi: 'Quản lý server state bằng React Query và xây dựng giao diện với Material UI.',
        },
        {
          en: 'Worked in a Scrum team, reporting progress daily to the product owner.',
          vi: 'Làm việc theo mô hình Scrum, báo cáo tiến độ hằng ngày cho product owner.',
        },
      ],
      stack: ['Next.js', 'TypeScript', 'React Query', 'Material UI'],
    },
    {
      id: 'justenough',
      role: { en: 'Frontend Developer Intern', vi: 'Thực tập sinh Frontend' },
      company: 'Just Enough',
      context: {
        en: 'Bakery e-commerce app with online payment.',
        vi: 'Ứng dụng e-commerce cho tiệm bánh, có thanh toán trực tuyến.',
      },
      startYear: 2020,
      endYear: 2020,
      highlights: [
        {
          en: 'Implemented the product browsing, cart and checkout flows with Next.js and Theme UI.',
          vi: 'Xây dựng các luồng duyệt sản phẩm, giỏ hàng và thanh toán bằng Next.js và Theme UI.',
        },
        {
          en: 'Integrated a Strapi and MongoDB backend, with order confirmation emails sent through Nodemailer.',
          vi: 'Tích hợp backend Strapi và MongoDB, gửi email xác nhận đơn hàng qua Nodemailer.',
        },
        {
          en: 'Delivered features under the guidance of a mentor and the team lead.',
          vi: 'Hoàn thành các tính năng dưới sự hướng dẫn của mentor và team leader.',
        },
      ],
      stack: ['Next.js', 'TypeScript', 'Theme UI', 'Strapi', 'MongoDB'],
    },
  ],
  credentials: [
    {
      id: 'degree',
      period: '2015 – 2020',
      title: { en: 'B.Sc. in Computer Science', vi: 'Cử nhân Khoa học máy tính' },
      issuer: {
        en: 'University of Information Technology (UIT), VNU-HCM',
        vi: 'Trường Đại học Công nghệ Thông tin (UIT), ĐHQG-HCM',
      },
    },
    {
      id: 'award-tma',
      period: '2023',
      title: {
        en: 'Recognition for high performance and teamwork',
        vi: 'Ghi nhận hiệu suất cao và tinh thần hỗ trợ đồng nghiệp',
      },
      issuer: { en: 'TMA Solutions', vi: 'TMA Solutions' },
    },
    {
      id: 'award-gbst',
      period: '2022',
      title: {
        en: 'Recognition for delivering a release ahead of schedule',
        vi: 'Ghi nhận hoàn thành release trước thời hạn',
      },
      issuer: { en: 'GBST', vi: 'GBST' },
    },
  ],
  projects: [
    {
      id: 'oms',
      name: 'Onflow OMS',
      year: 2026,
      type: { en: 'Company product', vi: 'Sản phẩm công ty' },
      role: { en: 'Primary frontend developer', vi: 'Frontend developer chính' },
      description: {
        en: 'Multichannel order management: orders from marketplaces, websites and social channels on one screen, inventory in sync, and every order handed to the fulfillment warehouse. Frontend restructured into seven feature-based modules, with a redesigned UI/UX, a typed data layer and lint-enforced import rules.',
        vi: 'Hệ thống quản lý bán hàng đa kênh: gom đơn từ sàn, website và mạng xã hội về một màn hình, đồng bộ tồn kho và chuyển đơn sang kho fulfillment xử lý. Frontend được tái cấu trúc thành bảy module feature-based, thiết kế lại UI/UX, kèm data layer có type và quy tắc import do lint kiểm soát.',
      },
      metrics: [
        { value: '−50%', label: { en: 'release cycle', vi: 'chu kỳ release' } },
        { value: '>50%', label: { en: 'faster deploys', vi: 'deploy nhanh hơn' } },
        {
          value: '2.1k',
          label: { en: 'TypeScript files, no JavaScript', vi: 'file TypeScript, không còn JavaScript' },
        },
      ],
      tech: ['React', 'TypeScript', 'TanStack Query', 'React Hook Form', 'Vitest'],
      visual: 'dashboard',
      demoUrl: 'https://onflow.vn/giai-phap/he-thong-quan-ly-ban-hang-da-kenh-oms/',
      appUrl: 'https://oms.onflow.vn',
    },
    {
      id: 'fulfillment-connect',
      name: 'Onflow Fulfillment Connect',
      year: 2026,
      type: { en: 'Company product', vi: 'Sản phẩm công ty' },
      role: { en: 'Built from scratch', vi: 'Xây dựng từ đầu' },
      description: {
        en: 'Fulfillment Connect lets a business keep the OMS or ERP it already runs and plug Onflow fulfillment into it. This is its console: create and track shipments, handle returns, run inbound orders, watch inventory and pull reports. Released behind feature flags.',
        vi: 'Fulfillment Connect giúp doanh nghiệp giữ nguyên OMS hoặc ERP đang dùng và kết nối với dịch vụ fulfillment của Onflow. Đây là giao diện của sản phẩm: tạo và theo dõi vận đơn, xử lý hoàn trả, quản lý đơn nhập hàng, theo dõi tồn kho và xuất báo cáo. Phát hành qua feature flag.',
      },
      metrics: [
        { value: '9', label: { en: 'feature modules', vi: 'module tính năng' } },
        { value: '7', label: { en: 'weeks to production', vi: 'tuần tới production' } },
        { value: '197', label: { en: 'test files', vi: 'file test' } },
      ],
      tech: ['React', 'TypeScript', 'Zustand', 'TanStack Query', 'Unleash'],
      visual: 'map',
      demoUrl: 'https://onflow.vn/fulfillment-connect/',
      appUrl: 'https://portal.onflow.vn',
    },
    {
      id: 'shared',
      name: 'Onflow Shared Packages',
      year: 2026,
      type: { en: 'Internal library', vi: 'Thư viện nội bộ' },
      role: { en: 'Author and maintainer', vi: 'Tác giả và maintainer' },
      description: {
        en: 'The frontend library shared across the company: components, hooks and runtime published as three private npm packages. UI, core (API client, session, analytics, feature flags) and config (ESLint, Prettier, TypeScript presets, git hooks).',
        vi: 'Thư viện frontend dùng chung của công ty: component, hook và runtime phát hành thành ba package npm nội bộ. UI, core (API client, session, analytics, feature flag) và config (preset ESLint, Prettier, TypeScript, git hook).',
      },
      metrics: [
        { value: '3', label: { en: 'published packages', vi: 'package đã phát hành' } },
        { value: '2', label: { en: 'apps built on them', vi: 'ứng dụng đang dùng' } },
        { value: '173', label: { en: 'test files', vi: 'file test' } },
      ],
      tech: ['React', 'TypeScript', 'Sass', 'ESLint', 'GitHub Packages'],
      visual: 'components',
    },
  ],
  archive: [
    {
      id: 'ops',
      year: 2026,
      name: 'Onflow Operations System (OPS)',
      description: {
        en: 'Where the other Onflow products are configured. Built its inbound, outbound, courier and report screens.',
        vi: 'Nơi cấu hình cho các sản phẩm khác của Onflow. Phát triển các màn hình nhập kho, xuất kho, vận chuyển và báo cáo.',
      },
      tech: ['React', 'TypeScript', 'Redux Toolkit', 'TanStack Query'],
    },
    {
      id: 'inbound-booking',
      year: 2026,
      name: 'Warehouse Inbound Booking',
      description: {
        en: 'Web form for booking warehouse inbound slots: it reads the order from the OMS, checks every time slot against capacity in Google Sheets and spills over into the next slots.',
        vi: 'Form web đặt lịch nhập kho: lấy thông tin đơn nhập từ OMS, kiểm tra sức chứa từng khung giờ trên Google Sheets và tự phân bổ sang các khung giờ kế tiếp.',
      },
      tech: ['Google Apps Script', 'Google Sheets', 'JavaScript'],
    },
    {
      id: 'taiga-tools',
      year: 2026,
      name: 'Taiga Sync for Google Sheets',
      description: {
        en: 'Google Sheets menu for product owners: syncs epics and issues from Taiga, tracks user-story progress, creates items in bulk from rows and closes an epic when its stories are done.',
        vi: 'Menu trên Google Sheets cho product owner: đồng bộ epic và issue từ Taiga, theo dõi tiến độ user story, tạo hàng loạt từ các dòng trong sheet và tự đóng epic khi xong hết story.',
      },
      tech: ['Google Apps Script', 'Taiga API', 'Google Sheets'],
    },
    {
      id: 'diamond-owl',
      year: 2024,
      name: 'Diamond Owl Solution Website',
      description: {
        en: 'Company website for an IT services firm, with a Strapi CMS and a GraphQL content API.',
        vi: 'Website doanh nghiệp cho một công ty dịch vụ công nghệ, dùng CMS Strapi và content API GraphQL.',
      },
      tech: ['Next.js', 'Strapi', 'GraphQL', 'Docker'],
    },
    {
      id: 'composer',
      year: 2023,
      name: 'GBST Composer',
      description: {
        en: 'Wealth administration platform for investment platforms, pension providers and insurers. Built frontend features in React.',
        vi: 'Nền tảng quản trị tài sản cho các nền tảng đầu tư, quỹ hưu trí và công ty bảo hiểm. Phát triển tính năng frontend bằng React.',
      },
      tech: ['React', 'Jest'],
      url: 'https://gbst.com/composer/',
    },
    {
      id: 'catalyst',
      year: 2023,
      name: 'GBST Catalyst',
      description: {
        en: 'Digital wealth portal where investors and advisers onboard, transact and self-serve online. New React features next to the Ember.js app.',
        vi: 'Cổng thông tin quản lý tài sản, nơi nhà đầu tư và cố vấn mở tài khoản, giao dịch và tự thao tác trực tuyến. Tính năng mới bằng React bên cạnh ứng dụng Ember.js.',
      },
      tech: ['React', 'Ember.js', 'Jest'],
      url: 'https://gbst.com/catalyst/',
    },
    {
      id: 'pavn',
      year: 2021,
      name: 'PAVN Marketplace',
      description: {
        en: 'Server-rendered marketplace for buying and selling online services.',
        vi: 'Sàn giao dịch dịch vụ trực tuyến, render phía server.',
      },
      tech: ['Next.js', 'React Query', 'Material UI'],
    },
    {
      id: 'bakery',
      year: 2020,
      name: 'Bakery Online Store',
      description: {
        en: 'E-commerce app for a bakery: browse, cart, checkout and online payment.',
        vi: 'Ứng dụng e-commerce cho tiệm bánh: duyệt sản phẩm, giỏ hàng, thanh toán trực tuyến.',
      },
      tech: ['Next.js', 'Theme UI', 'Strapi', 'MongoDB'],
      url: 'https://bakery-app.vercel.app',
    },
  ],
  // Nothing to list yet: the section (and the "Writing" navigation link) stays hidden while empty.
  writing: [],
  // Summaries of feedback as the owner of this profile reported it, not verbatim quotations:
  // that is why no entry carries a name.
  testimonials: [
    {
      id: 'tech-lead',
      quote: {
        en: 'Responsible and persistent: takes ownership of the work, digs into unfamiliar problems until they are understood, adapts quickly to a new environment and is ready to put in extra time when the project needs it.',
        vi: 'Có trách nhiệm với công việc, chịu khó tìm hiểu đến cùng những vấn đề mới, thích nghi nhanh với môi trường và sẵn sàng dành thêm thời gian khi dự án cần.',
      },
      role: { en: 'Tech Lead', vi: 'Tech Lead' },
      where: { en: 'Onflow Fulfillment', vi: 'Onflow Fulfillment' },
    },
    {
      id: 'teammates',
      quote: {
        en: 'Enthusiastic, friendly and easy to work with. Settles into a new team quickly and is always willing to help when a colleague needs a hand.',
        vi: 'Nhiệt huyết, hòa đồng và thân thiện. Hòa nhập nhanh với đội nhóm mới và luôn sẵn sàng hỗ trợ khi đồng nghiệp cần.',
      },
      role: { en: 'Teammates', vi: 'Đồng nghiệp' },
      where: { en: 'Onflow and previous companies', vi: 'Onflow và các công ty trước' },
    },
  ],
  seo: {
    title: {
      en: 'Kiệt Nguyễn · Senior Frontend Developer',
      vi: 'Kiệt Nguyễn · Senior Frontend Developer',
    },
    description: {
      en: 'Kiệt Nguyễn is a senior frontend developer in Ho Chi Minh City with 6+ years in React and TypeScript, building order management and fulfillment software at Onflow.',
      vi: 'Kiệt Nguyễn là senior frontend developer tại TP. Hồ Chí Minh với hơn 6 năm kinh nghiệm React và TypeScript, đang xây dựng hệ thống quản lý đơn hàng và fulfillment tại Onflow.',
    },
    ogLabel: { en: 'Portfolio', vi: 'Hồ sơ cá nhân' },
    keywords: {
      en: ['senior frontend developer', 'React', 'TypeScript', 'order management', 'Ho Chi Minh City'],
      vi: ['senior frontend developer', 'React', 'TypeScript', 'quản lý đơn hàng', 'TP. Hồ Chí Minh'],
    },
  },
};

/** The first couple of items of each skill group: a short "main stack" for decorative use. */
export function topStack(limit = 5): readonly string[] {
  return profile.skills.flatMap((group) => group.items.slice(0, 2).map((item) => item.name)).slice(0, limit);
}

/** Every skill name, in the order of the groups. */
export function allSkills(): readonly string[] {
  return profile.skills.flatMap((group) => group.items.map((item) => item.name));
}

/** Pick a localized field. */
export function pick<T>(value: Localized<T>, lang: Lang): T {
  return value[lang];
}
