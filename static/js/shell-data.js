(function () {
    const fs = {
        type: "dir",
        children: {
            about: {
                type: "file",
                kind: "text",
                value: [
                    "Backend and data engineer focused on pragmatic systems design.",
                    "I like reliable platforms, clear interfaces, and software that stays debuggable under load.",
                ],
            },
            contact: {
                type: "file",
                kind: "contact",
                value: [
                    { label: "email", href: "mailto:zschu15@gmail.com" },
                    { label: "linkedin", href: "https://www.linkedin.com/in/zschumacher/" },
                    { label: "github", href: "https://github.com/zschumacher" },
                ],
            },
            roles: {
                type: "dir",
                children: {
                    current: {
                        type: "symlink",
                        target: "/roles/moxfive",
                    },
                    moxfive: {
                        type: "dir",
                        children: {
                            "staff-engineer": {
                                type: "file",
                                kind: "text",
                                value: [
                                    "title: Staff Engineer",
                                    "company: MOXFIVE",
                                    "dates: Current",
                                ],
                            },
                        },
                    },
                    draftkings: {
                        type: "dir",
                        children: {
                            "principal-engineer": {
                                type: "file",
                                kind: "text",
                                value: [
                                    "title: Principal Engineer",
                                    "company: DraftKings",
                                    "dates: Dec 2024 - Current on public profile",
                                ],
                            },
                        },
                    },
                    simplebet: {
                        type: "dir",
                        children: {
                            "staff-engineer": {
                                type: "file",
                                kind: "text",
                                value: [
                                    "title: Staff Engineer",
                                    "company: SimpleBet",
                                    "dates: Mar 2023 - Dec 2024",
                                ],
                            },
                            "senior-manager-data-engineering": {
                                type: "file",
                                kind: "text",
                                value: [
                                    "title: Senior Manager, Data Engineering",
                                    "company: SimpleBet",
                                    "dates: Jan 2021 - Mar 2023",
                                ],
                            },
                            "senior-software-engineer": {
                                type: "file",
                                kind: "text",
                                value: [
                                    "title: Senior Software Engineer",
                                    "company: SimpleBet",
                                    "dates: Nov 2019 - Jan 2021",
                                ],
                            },
                        },
                    },
                    "quest-analytics": {
                        type: "dir",
                        children: {
                            "software-engineer": {
                                type: "file",
                                kind: "text",
                                value: [
                                    "title: Software Engineer",
                                    "company: Quest Analytics",
                                    "dates: Jun 2019 - Nov 2019",
                                ],
                            },
                        },
                    },
                    selectquote: {
                        type: "dir",
                        children: {
                            "data-engineer": {
                                type: "file",
                                kind: "text",
                                value: [
                                    "title: Data Engineer",
                                    "company: SelectQuote Insurance Services",
                                    "dates: Jan 2019 - Jun 2019",
                                ],
                            },
                        },
                    },
                },
            },
            skills: {
                type: "dir",
                children: {
                    python: { type: "file", kind: "string", value: "python" },
                    sql: { type: "file", kind: "string", value: "sql" },
                    golang: { type: "file", kind: "string", value: "golang" },
                    spark: { type: "file", kind: "string", value: "spark" },
                    kafka: { type: "file", kind: "string", value: "kafka" },
                    "big-data": { type: "file", kind: "string", value: "big-data" },
                },
            },
            hobbies: {
                type: "dir",
                children: {
                    pickleball: { type: "file", kind: "string", value: "pickleball" },
                    "video-games": { type: "file", kind: "string", value: "video-games" },
                    "board-games": { type: "file", kind: "string", value: "board-games" },
                    traveling: { type: "file", kind: "string", value: "traveling" },
                    coding: { type: "file", kind: "string", value: "coding" },
                    kayaking: { type: "file", kind: "string", value: "kayaking" },
                },
            },
            links: {
                type: "dir",
                children: {
                    email: { type: "link", label: "email", href: "mailto:zschu15@gmail.com" },
                    linkedin: { type: "link", label: "linkedin", href: "https://www.linkedin.com/in/zschumacher/" },
                    github: { type: "link", label: "github", href: "https://github.com/zschumacher" },
                },
            },
        },
    };

    const env = {
        LOCATION: "St. Louis, Missouri",
        EDUCATION: "BSB Information Systems Technology, University of Kansas",
        SHELL: "/bin/bash",
        USER: "zach",
        HOSTNAME: "portfolio",
        TERM: "dumb",
        HOME: "/",
        PWD: "/",
        OLDPWD: "/",
    };

    const initialLines = [
        ["command", { prompt: "zach@portfolio:/$", command: "whoami" }],
        ["plain", "Zach Schumacher"],
        ["command", { prompt: "zach@portfolio:/$", command: "ls /" }],
        [
            "entries",
            [
                { kind: "file", label: "about", path: "/about" },
                { kind: "file", label: "contact", path: "/contact" },
                { kind: "dir", label: "roles", path: "/roles/" },
                { kind: "dir", label: "skills", path: "/skills/" },
                { kind: "dir", label: "hobbies", path: "/hobbies/" },
                { kind: "dir", label: "links", path: "/links/" },
            ],
        ],
    ];

    const manPages = {
        shell: [
            ["plain", "NAME"],
            ["plain", "    shell - portfolio command interface"],
            ["plain", "SYNOPSIS"],
            ["plain", "    whoami  pwd  history  clear"],
            ["plain", "    printenv [KEY ...]  env  echo [TEXT]"],
            ["plain", "    ls [-a] [-l] [PATH]  tree [PATH]  file [PATH]"],
            ["plain", "    cd [PATH]  cat [PATH]  readlink [PATH]"],
            ["plain", "    which [CMD]  uname [-a]  open [PATH]"],
        ],
        ls: [
            ["plain", "NAME"],
            ["plain", "    ls - list directory contents"],
            ["plain", "SYNOPSIS"],
            ["plain", "    ls [-a] [-l] [PATH]"],
        ],
        cat: [
            ["plain", "NAME"],
            ["plain", "    cat - print file contents"],
            ["plain", "SYNOPSIS"],
            ["plain", "    cat PATH"],
        ],
        cd: [
            ["plain", "NAME"],
            ["plain", "    cd - change the shell working directory"],
            ["plain", "SYNOPSIS"],
            ["plain", "    cd [PATH]"],
        ],
        printenv: [
            ["plain", "NAME"],
            ["plain", "    printenv - print environment variables"],
            ["plain", "SYNOPSIS"],
            ["plain", "    printenv [KEY ...]"],
        ],
        env: [
            ["plain", "NAME"],
            ["plain", "    env - print the environment"],
            ["plain", "SYNOPSIS"],
            ["plain", "    env"],
        ],
        file: [
            ["plain", "NAME"],
            ["plain", "    file - determine file type"],
            ["plain", "SYNOPSIS"],
            ["plain", "    file PATH"],
        ],
        readlink: [
            ["plain", "NAME"],
            ["plain", "    readlink - print resolved symbolic link target"],
            ["plain", "SYNOPSIS"],
            ["plain", "    readlink PATH"],
        ],
        which: [
            ["plain", "NAME"],
            ["plain", "    which - locate a command"],
            ["plain", "SYNOPSIS"],
            ["plain", "    which CMD"],
        ],
        uname: [
            ["plain", "NAME"],
            ["plain", "    uname - print system information"],
            ["plain", "SYNOPSIS"],
            ["plain", "    uname [-a]"],
        ],
        open: [
            ["plain", "NAME"],
            ["plain", "    open - open a link target"],
            ["plain", "SYNOPSIS"],
            ["plain", "    open PATH"],
        ],
    };

    window.PortfolioShellData = {
        env,
        fs,
        initialLines,
        manPages,
    };
})();
