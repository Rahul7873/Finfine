/**
 * Pre-configured sample CSV datasets tailored for Indian Freelancers & Independent Professionals
 */

export const SAMPLE_FREELANCER_CSV = `date,description,amount,type
2026-09-01,Client Retainer - Design Sprint,45000,CREDIT
2026-09-02,Zomato - Healthy Eats,480,DEBIT
2026-09-03,Uber - Client Meeting Indiranagar,360,DEBIT
2026-09-04,Amazon - Ergonomic Laptop Stand,2199,DEBIT
2026-09-05,Netflix India Premium,649,DEBIT
2026-09-06,Swiggy Instamart Groceries,920,DEBIT
2026-09-07,Airtel Xstream Fiber Broadband,1179,DEBIT
2026-09-08,Figma Professional Subscription,1250,DEBIT
2026-09-09,Upwork USD Payout,32500,CREDIT
2026-09-10,BESCOM Electricity Bill,2140,DEBIT
2026-09-11,Cult.fit Gym Monthly,2400,DEBIT
2026-09-12,Zomato - Cafe Coffee Day,280,DEBIT
2026-09-13,Uber - Return Trip,410,DEBIT
2026-09-14,Apollo Pharmacy - Vitamins,650,DEBIT
2026-09-15,Swiggy Food Delivery,540,DEBIT
2026-09-16,Amazon - Type-C Hub & Cables,1850,DEBIT
2026-09-17,BookMyShow - IMAX Movie,950,DEBIT
2026-09-18,Razorpay Invoicing Payout,18000,CREDIT
2026-09-19,WeWork Day Pass Co-working,1100,DEBIT
2026-09-20,Zomato - Dinner with Friends,1650,DEBIT
2026-09-21,Spotify Premium Family,179,DEBIT
2026-09-22,Uber Auto,140,DEBIT
2026-09-23,Croma - Apple MacBook Display Repair,28500,DEBIT
2026-09-24,Zepto Daily Essentials,390,DEBIT
2026-09-25,Indian Oil Fuel Petrol,1500,DEBIT
2026-09-26,Zomato - Weekend Brunch,880,DEBIT
2026-09-27,GitHub Pro Copilot,820,DEBIT
2026-09-28,Swiggy Instamart,760,DEBIT
2026-09-29,Mobile Recharge Jio,399,DEBIT
2026-09-30,Society Maintenance,2800,DEBIT`;

export const SAMPLE_RECURRING_CREEP_CSV = `date,description,amount,type
2026-08-01,Client Retainer Advance,55000,CREDIT
2026-08-03,Netflix India,649,DEBIT
2026-08-05,Spotify India,179,DEBIT
2026-08-07,Airtel Broadband,1179,DEBIT
2026-08-10,Cult.fit Gym,2400,DEBIT
2026-08-15,Swiggy Delivery,650,DEBIT
2026-08-20,Uber City Ride,380,DEBIT
2026-08-28,Amazon Prime Annual,1499,DEBIT
2026-09-01,Client Retainer Final,60000,CREDIT
2026-09-03,Netflix India,649,DEBIT
2026-09-05,Spotify India,179,DEBIT
2026-09-07,Airtel Broadband,1179,DEBIT
2026-09-10,Cult.fit Gym,2400,DEBIT
2026-09-12,Zomato Dineout,1200,DEBIT
2026-09-14,Zomato Dineout,1200,DEBIT
2026-09-18,Apple Studio Display Stand,18900,DEBIT
2026-09-22,Figma Professional,1250,DEBIT
2026-09-25,Indian Oil Fuel,2000,DEBIT`;

export const SAMPLE_BANK_STATEMENT_ROWS = [
  { date: '2026-09-01', description: 'UPI/Swiggy/Order129', amount: 480, type: 'DEBIT' },
  { date: '2026-09-02', description: 'NEFT-Client Retainer Payout', amount: 85000, type: 'CREDIT' },
  { date: '2026-09-03', description: 'Uber Trip Indiranagar', amount: 350, type: 'DEBIT' },
  { date: '2026-09-04', description: 'Amazon India Electronics', amount: 2499, type: 'DEBIT' },
  { date: '2026-09-05', description: 'Netflix Entertainment Subscription', amount: 649, type: 'DEBIT' },
  { date: '2026-09-08', description: 'Bescom Electricity Bill', amount: 1850, type: 'DEBIT' },
  { date: '2026-09-12', description: 'WeWork Monthly Desk Rent', amount: 12500, type: 'DEBIT' },
  { date: '2026-09-15', description: 'Upwork USD Consulting Deposit', amount: 42000, type: 'CREDIT' },
  { date: '2026-09-18', description: 'Zomato Food Delivery', amount: 620, type: 'DEBIT' },
  { date: '2026-09-22', description: 'Apple Service Studio Display', amount: 18900, type: 'DEBIT' },
  { date: '2026-09-25', description: 'Apollo Pharmacy Meds', amount: 780, type: 'DEBIT' },
  { date: '2026-09-28', description: 'Airtel Xstream Fiber', amount: 1179, type: 'DEBIT' }
];

export const SAMPLE_PDF_STATEMENT_TEXT = `
HDFC Bank - Statement of Account
Account: 5010029384712
Branch: Indiranagar, Bengaluru
Date Narration Withdrawal Deposit Balance
01/09/2026 UPI/Swiggy/Order129 480.00 0.00 49,520.00
02/09/2026 NEFT-Client Retainer Payout 0.00 85,000.00 1,34,520.00
03/09/2026 Uber Trip Indiranagar 350.00 0.00 1,34,170.00
04/09/2026 Amazon India Electronics 2,499.00 0.00 1,31,671.00
05/09/2026 Netflix Entertainment Subscription 649.00 0.00 1,31,022.00
08/09/2026 Bescom Electricity Bill 1,850.00 0.00 1,29,172.00
12/09/2026 WeWork Monthly Desk Rent 12,500.00 0.00 1,16,672.00
15/09/2026 Upwork USD Consulting Deposit 0.00 42,000.00 1,58,672.00
18/09/2026 Zomato Food Delivery 620.00 0.00 1,58,052.00
22/09/2026 Apple Service Studio Display 18,900.00 0.00 1,39,152.00
25/09/2026 Apollo Pharmacy Meds 780.00 0.00 1,38,372.00
28/09/2026 Airtel Xstream Fiber 1,179.00 0.00 1,37,193.00
`;

export const SAMPLE_PHONEPE_STATEMENT_ROWS = [
  { date: '2026-09-02', description: 'Paid to Swiggy Bangalore', amount: 480, type: 'DEBIT' },
  { date: '2026-09-04', description: 'Received from Client TechCorp Solutions', amount: 65000, type: 'CREDIT' },
  { date: '2026-09-05', description: 'Paid to Netflix India', amount: 649, type: 'DEBIT' },
  { date: '2026-09-07', description: 'Paid to Uber India Ride', amount: 340, type: 'DEBIT' },
  { date: '2026-09-09', description: 'Paid to BESCOM Electricity Bill', amount: 2150, type: 'DEBIT' },
  { date: '2026-09-12', description: 'Paid to Zepto Groceries', amount: 560, type: 'DEBIT' },
  { date: '2026-09-15', description: 'Cashback from PhonePe', amount: 75, type: 'CREDIT' },
  { date: '2026-09-18', description: 'Paid to Starbucks Indiranagar', amount: 420, type: 'DEBIT' },
  { date: '2026-09-20', description: 'Received from Ananya Sharma Freelance', amount: 28000, type: 'CREDIT' },
  { date: '2026-09-22', description: 'Paid to Apollo Pharmacy', amount: 890, type: 'DEBIT' },
  { date: '2026-09-25', description: 'Paid to Airtel Broadband Fiber', amount: 1179, type: 'DEBIT' },
  { date: '2026-09-28', description: 'Paid to Cult.fit Gym Monthly', amount: 2400, type: 'DEBIT' }
];

export const SAMPLE_PAYTM_STATEMENT_ROWS = [
  { date: '2026-09-01', description: 'Added money to Paytm Wallet', amount: 10000, type: 'CREDIT' },
  { date: '2026-09-03', description: 'Paid to Blinkit Quick Commerce', amount: 720, type: 'DEBIT' },
  { date: '2026-09-06', description: 'Paid to Zomato Food Orders', amount: 530, type: 'DEBIT' },
  { date: '2026-09-08', description: 'Refund for Swiggy Order #8921', amount: 530, type: 'CREDIT' },
  { date: '2026-09-11', description: 'Automatic Payment to Spotify', amount: 179, type: 'DEBIT' },
  { date: '2026-09-14', description: 'Paid to Tata Power Delhi', amount: 1850, type: 'DEBIT' },
  { date: '2026-09-17', description: 'Payment to Amazon India', amount: 3299, type: 'DEBIT' },
  { date: '2026-09-19', description: 'Money received from Ramesh Client', amount: 45000, type: 'CREDIT' },
  { date: '2026-09-21', description: 'Paid to Ola Cabs', amount: 290, type: 'DEBIT' },
  { date: '2026-09-24', description: 'Cashback received from Paytm', amount: 50, type: 'CREDIT' },
  { date: '2026-09-27', description: 'Paid to WeWork Day Office Pass', amount: 1100, type: 'DEBIT' }
];

