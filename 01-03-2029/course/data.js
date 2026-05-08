const courses = [
    {
        id: "101",
        title: "Full Stack Web Development Bootcamp",
        category: "Development",
        type: "video",
        level: "Beginner",
        duration: "45 Hours",
        instructor: "Dr. Angela Yu",
        rating: 4.8,
        price: 499,
        originalPrice: 3499,
        thumbnail: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?q=80&w=2670&auto=format&fit=crop",
        description: "Become a full-stack web developer with just one course. HTML, CSS, Javascript, Node, React, MongoDB, Web3 and DApps.",
        detailedCurriculum: [
            {
                title: "Section 1: Frontend Fundamentals",
                lessons: [
                    { title: "Introduction to HTML5", duration_mins: 15 },
                    { title: "CSS Flexbox & Grid Masterclass", duration_mins: 45 },
                    { title: "Modern JavaScript (ES6+)", duration_mins: 60 },
                    { title: "Project: Responsive Portfolio", duration_mins: 120 }
                ]
            },
            {
                title: "Section 2: Mastering React",
                lessons: [
                    { title: "React Components & Props", duration_mins: 30 },
                    { title: "State Management with Hooks", duration_mins: 50 },
                    { title: "Routing with React Router", duration_mins: 40 },
                    { title: "API Integration & Fetching", duration_mins: 55 }
                ]
            },
            {
                title: "Section 3: Backend & Databases",
                lessons: [
                    { title: "Node.js & Express Basics", duration_mins: 45 },
                    { title: "MongoDB Schema Design", duration_mins: 35 },
                    { title: "Authentication with JWT", duration_mins: 60 }
                ]
            }
        ],
        curriculum: [
            "Front-End Web Development",
            "Back-End Web Development",
            "Databases",
            "React.js",
            "Deployment"
        ]
    },
    {
        id: "102",
        title: "The Python Mega Course: Build 10 Real World Apps",
        category: "Programming",
        type: "video",
        level: "Intermediate",
        duration: "33 Hours",
        instructor: "Ardit Sulce",
        rating: 4.7,
        price: 399,
        originalPrice: 2999,
        thumbnail: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2664&auto=format&fit=crop",
        description: "Become a Python programmer by learning how to build real-world applications including web apps, data analysis, and automation tools.",
        curriculum: [
            "Python Basics",
            "Data Analysis with Pandas",
            "Web Development with Flask",
            "Desktop GUI Apps"
        ]
    },
    {
        id: "103",
        title: "Digital Marketing Masterclass",
        category: "Marketing",
        type: "video",
        level: "All Levels",
        duration: "22 Hours",
        instructor: "Phil Ebiner",
        rating: 4.6,
        price: 299,
        originalPrice: 1999,
        thumbnail: "https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=2706&auto=format&fit=crop",
        description: "The complete digital marketing course. Master social media marketing, SEO, YouTube, Email, Facebook Marketing, Analytics and more!",
        curriculum: [
            "Social Media Marketing",
            "SEO & Content Marketing",
            "Email Marketing",
            "Google Analytics"
        ]
    },
    {
        id: "104",
        title: "Zero to One: Notes on Startups",
        category: "Business",
        type: "ebook",
        level: "n/a",
        duration: "200 Pages",
        instructor: "Peter Thiel",
        rating: 4.9,
        price: 199,
        originalPrice: 999,
        thumbnail: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=2573&auto=format&fit=crop",
        description: "The next Bill Gates will not build an operating system. The next Larry Page or Sergey Brin won't make a search engine. If you are copying these people, you aren't learning from them.",
        curriculum: [
            "The Challenge of the Future",
            "Party Like It's 1999",
            "All Happy Companies Are Different",
            "The Ideology of Competition"
        ]
    },
    {
        id: "105",
        title: "Atomic Habits",
        category: "Self-Help",
        type: "ebook",
        level: "n/a",
        duration: "320 Pages",
        instructor: "James Clear",
        rating: 4.9,
        price: 249,
        originalPrice: 1299,
        thumbnail: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2612&auto=format&fit=crop",
        description: "No matter your goals, Atomic Habits offers a proven framework for improving--every day.",
        curriculum: [
            "The Fundamentals",
            "The 1st Law: Make It Obvious",
            "The 2nd Law: Make It Attractive",
            "The 3rd Law: Make It Easy",
            "The 4th Law: Make It Satisfying"
        ]
    },
    {
        id: "106",
        title: "Mastering Data Science with R",
        category: "Data Science",
        type: "video",
        level: "Advanced",
        duration: "50 Hours",
        instructor: "Kirill Eremenko",
        rating: 4.8,
        price: 599,
        originalPrice: 4999,
        thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop",
        description: "Data Science A-Z: Real-Life Data Science Exercises Included. Learn R from scratch.",
        curriculum: [
            "R Programming",
            "Data Visualization",
            "Machine Learning",
            "Statistical Analysis"
        ]
    },
    {
        id: "107",
        title: "Advanced Java Masterclass",
        category: "Programming",
        type: "video",
        level: "Advanced",
        duration: "80 Hours",
        instructor: "Tim Buchalka",
        rating: 4.9,
        price: 699,
        originalPrice: 5999,
        thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2670&auto=format&fit=crop",
        description: "Master Java programming with Spring Boot, Hibernate, and microservices architecture.",
        curriculum: ["Spring Boot Basics", "Hibernate ORM", "Microservices Architecture", "Java Streams API"]
    },
    {
        id: "108",
        title: "UI/UX Design Essentials",
        category: "Design",
        type: "video",
        level: "Beginner",
        duration: "15 Hours",
        instructor: "Dan Scott",
        rating: 4.7,
        price: 349,
        originalPrice: 2499,
        thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=2564&auto=format&fit=crop",
        description: "Learn Figma and Adobe XD to create stunning web and mobile app interfaces.",
        curriculum: ["Design Thinking", "Figma Fundamentals", "Prototyping", "User Testing"]
    },
    {
        id: "109",
        title: "Cryptocurrency Trading 101",
        category: "Finance",
        type: "video",
        level: "Beginner",
        duration: "10 Hours",
        instructor: "Suppoman",
        rating: 4.5,
        price: 159,
        originalPrice: 999,
        thumbnail: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=2669&auto=format&fit=crop",
        description: "Understand Bitcoin, Ethereum, and how to trade cryptocurrencies securely.",
        curriculum: ["Blockchain Basics", "Exchange Setup", "Technical Analysis", "Risk Management"]
    }
];
