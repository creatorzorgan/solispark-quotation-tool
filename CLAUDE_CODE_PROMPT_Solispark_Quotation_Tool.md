# CLAUDE CODE PROMPT — Solispark Energy Quotation Software

## WHAT TO DO BEFORE PASTING THIS PROMPT

### Step 1: Create a new Claude Code project or session
### Step 2: Add these files to the project context (if available):
- The reference video or screenshots of the competitor's quotation tool
- The Solispark logo (PNG or SVG)
- Any existing proposal PDFs Solispark has sent to clients (for reference on what they currently include)

### Step 3: Paste everything below this line as your first message in Claude Code

---

## START OF PROMPT

Build me a full-stack web-based quotation and proposal generation tool for a solar energy company called **Solispark Energy Pvt. Ltd.** This tool will be used by their sales team to generate professional, branded solar installation proposals for residential and commercial clients.

## BRAND IDENTITY (Use these EXACTLY)

```
Primary Colors:
- Navy (Dark):    #0F1A2E
- Navy (Mid):     #1A2744  
- Navy (Light):   #152036
- Gold (Primary): #F5A623
- Gold (Light):   #FFD080
- Gold (Dark):    #D4891A
- White:          #FFFFFF
- Off-White:      #F8F6F1
- Gray 100:       #F0EDE8
- Gray 200:       #D9D4CC
- Gray 600:       #6B6560

Typography:
- Headings: "Space Grotesk" (Google Fonts) — weights 500, 600, 700
- Body: "Plus Jakarta Sans" (Google Fonts) — weights 400, 500, 600, 700

Company Details:
- Name: Solispark Energy Pvt. Ltd.
- Tagline: "We Build Energy Empires."
- Address: #244, F Block, 15th Main Road, Sahakarnagar, Bengaluru - 92
- Phone 1: +91 98868 86122
- Phone 2: +91 77603 75599
- Email: solisparkenergy@gmail.com
- Website: solisparkenergy.com
- GSTIN: [To be added by client]

Certifications to display on proposals:
- MNRE Approved Vendor
- DPIIT Recognized (Startup India)
- Official Axitec Distribution Partner
- 30-Year Panel Replacement Warranty

Founders:
- Ranveer Dorai — Director of Engineering
- Pruthvik Hariprasad — Director of Strategy
```

## TOOL REQUIREMENTS

### 1. DASHBOARD / HOME SCREEN

A clean dashboard showing:
- "Create New Quotation" button (prominent, gold colored)
- Recent quotations list (table with: client name, date, system size, total value, status)
- Status options: Draft, Sent, Accepted, Expired
- Quick stats at top: Total Quotations This Month, Total Value Pipeline, Conversion Rate
- Search and filter functionality

### 2. QUOTATION CREATION FORM (Multi-Step Wizard)

**Step 1: Client Information**
- Client Full Name (text)
- Phone Number (text, with +91 prefix)
- Email Address (email)
- Property Address (textarea)
- Property Type (dropdown): Independent House, Villa, Apartment (Own Terrace), Housing Society, Factory/Manufacturing, Cold Storage, Commercial Building, Banquet Hall, Other
- Client Category (dropdown): Residential, Commercial, Industrial

**Step 2: Energy Assessment**
- Current Monthly Electricity Bill in ₹ (number input with slider from ₹1,000 to ₹5,00,000)
- Average Daily Power Consumption in kWh (auto-calculated from bill, but editable)
- Electricity Provider (dropdown): BESCOM, HESCOM, GESCOM, CESC, MESCOM, Other
- Current Per-Unit Rate (auto-filled based on provider and slab, but editable — default ₹7.50 for BESCOM high slab)
- Available Roof Area in sq.ft (number input)
- Roof Type (dropdown): RCC Flat Roof, Metal Sheet, Tiled, Mixed, Ground Mount
- Shading Issues (dropdown): No Shading, Partial Shading (Morning), Partial Shading (Afternoon), Significant Shading
- Number of Floors (dropdown): 1, 2, 3, 4+

**Step 3: System Configuration**
Auto-calculated but fully editable by the sales rep:
- Recommended System Size in kW (auto-calc from bill: monthly_bill / per_unit_rate / 30 / 4 hours peak sun, rounded up)
- Number of Panels (auto-calc: system_size_watts / panel_wattage)
- Panel Brand (dropdown with options): Axitec 545W (default), Adani 545W, Waaree 540W, Rayzon 550W, Custom
- Panel Wattage (auto-filled from brand selection, editable)
- Inverter Brand (dropdown): Solis 5kW, Solis 10kW, Sungrow 5kW, Sungrow 10kW, Custom
- Inverter Capacity (auto-filled, editable)
- Mounting Structure: Standard Elevated, Custom Fabricated, Ground Mount
- Battery Backup (toggle): None, 5kWh, 10kWh, Custom
- Net Metering (toggle, default ON)

**Step 4: Pricing & Payment**
Auto-calculated but all fields editable for custom pricing:

Cost Breakdown:
- Solar Panels Cost: (panel_count × per_panel_cost)
- Inverter Cost: (based on inverter selection)
- Mounting Structure Cost: (based on system size × per_kW_structure_rate)
- Electrical & Wiring: (flat rate or per_kW)
- Net Metering & BESCOM Fees: (flat rate ~₹5,000-15,000)
- Installation Labor: (per_kW rate)
- Transportation & Logistics: (flat rate)
- Government Subsidy (if applicable): (negative value, auto-calculated based on system size — residential systems up to 10kW get subsidy)

Use these DEFAULT per-unit pricing (editable by admin):
```
Per Panel Cost (Axitec 545W): ₹15,500
Per Panel Cost (Adani 545W): ₹14,500
Per Panel Cost (Waaree 540W): ₹14,000
Per Panel Cost (Rayzon 550W): ₹13,500
Inverter (Solis 5kW): ₹45,000
Inverter (Solis 10kW): ₹85,000
Inverter (Sungrow 5kW): ₹48,000
Inverter (Sungrow 10kW): ₹90,000
Mounting Structure per kW: ₹8,000
Electrical & Wiring per kW: ₹5,000
Net Metering Fees: ₹10,000
Installation Labor per kW: ₹4,000
Transport (flat): ₹5,000
```

Total System Cost (auto-sum)
Applicable Government Subsidy (auto-calc for residential)
Net Cost After Subsidy
GST @ 13.8% (on applicable components)
Grand Total

Payment Schedule (pre-filled with Solispark's standard terms):
- Advance (30%): ₹ [auto-calc]
- Before Material Dispatch (65%): ₹ [auto-calc]
- Post-Installation & Commissioning (5%): ₹ [auto-calc]

**Step 5: ROI Projections**
All auto-calculated, displayed as a summary:
- Estimated Monthly Generation (kWh): system_size × 4 hours × 30 days
- Estimated Monthly Savings (₹): monthly_generation × per_unit_rate
- Annual Savings (₹)
- Payback Period (years): net_cost / annual_savings
- 25-Year Total Savings (₹): annual_savings × 25 (with 5% annual tariff escalation compounding)
- Effective ROI (%): ((25_year_savings - net_cost) / net_cost) × 100
- CO2 Offset per year (kg): monthly_generation × 12 × 0.82 (India grid emission factor)

**Step 6: Preview & Generate**
Show a full preview of the proposal before generating. Allow going back to edit any step.

### 3. PDF PROPOSAL OUTPUT

Generate a professional, multi-page PDF proposal with this structure:

**Page 1: Cover Page**
- Solispark logo (top)
- Title: "Solar Energy Proposal"
- Subtitle: "Prepared exclusively for [Client Name]"
- Date
- Property address
- Proposal reference number (auto-generated: SP-2026-XXXX)
- Solispark contact details
- Design: Navy background, gold accents, clean and premium

**Page 2: About Solispark**
- Brief company intro (2-3 lines)
- Key stats: 25+ Projects | 10MW+ Deployed | 50+ Industrial Partners
- Certifications: MNRE, DPIIT, Axitec Partner
- 30-Year Warranty badge
- Founders section (optional)

**Page 3: Energy Assessment Summary**
- Current monthly bill
- Current annual electricity spend
- Consumption analysis
- Recommended system size with rationale

**Page 4: System Design & Specifications**
- Table with all components:
  - Panel brand, model, wattage, quantity
  - Inverter brand, model, capacity
  - Mounting structure type
  - Wiring and electrical
  - Net metering
  - Battery (if applicable)
- Warranty details for each component

**Page 5: Investment Summary**
- Cost breakdown table (all line items)
- Subtotal
- Government subsidy (if applicable)
- GST
- Grand Total
- Payment schedule (30/65/5)

**Page 6: ROI & Savings Projection**
- Monthly savings
- Annual savings
- Payback period
- 25-year savings projection
- A simple bar chart or visual showing cumulative savings vs. cost over 25 years (year-by-year)
- CO2 offset stats

**Page 7: Why Solispark**
- 3D Modelling (visual before commitment)
- 48-Hour Service SLA
- Custom Structures (not cookie-cutter)
- Authorized Distributor (Axitec, Adani, Waaree)
- 30-Year Panel Warranty

**Page 8: Terms & Conditions**
- Standard terms (payment, installation timeline, warranty, maintenance, net metering process)
- Acceptance signature line
- Valid for 15 days from date of issue

**Page 9: Contact & Next Steps**
- "Ready to proceed? Here's what happens next:"
  1. Sign this proposal and pay 30% advance
  2. We schedule your installation within 7 days
  3. Installation completed in 7-14 days
  4. Net metering application filed
  5. System commissioned and you start saving
- Contact details
- QR code linking to WhatsApp

### 4. ADDITIONAL FEATURES

- **Save as Draft**: Save incomplete quotations to finish later
- **Duplicate Quotation**: Clone an existing quote and modify for a new client
- **Email/WhatsApp Send**: Button to open WhatsApp with pre-filled message and PDF attachment link, or email with PDF attached
- **Expiry Tracking**: Quotations auto-expire after 15 days, status changes to "Expired"
- **Admin Settings Page**: Update default pricing, company details, tax rates, and payment terms without touching code
- **Print-Friendly**: The PDF should also be printable on A4

### 5. TECH STACK PREFERENCES

- **Frontend**: React (with Tailwind CSS or styled-components using the brand colors above)
- **PDF Generation**: Use a library like jsPDF, react-pdf, or Puppeteer for high-quality PDF output
- **Data Storage**: Use localStorage for MVP (or SQLite/JSON file if building with a backend). No cloud database needed for V1.
- **Hosting**: Should be deployable as a static site (Vercel, Netlify) or run locally
- **No Authentication for V1**: Single-user tool. No login required.

### 6. UI/UX REQUIREMENTS

- The tool should look and feel like a premium SaaS product, not a basic form
- Use the navy + gold color scheme throughout
- Sidebar navigation with: Dashboard, Create Quotation, All Quotations, Settings
- Smooth transitions between wizard steps
- Mobile-responsive (sales reps might use this on tablets during site visits)
- Dark sidebar (navy) with light content area (off-white)
- Gold accents for buttons, active states, and highlights
- Clean typography using Space Grotesk for headings and Plus Jakarta Sans for body

### 7. SAMPLE DATA FOR TESTING

Pre-populate with 3 sample quotations:
```
Sample 1:
- Client: Vikram Sharma, Whitefield, Bengaluru
- Monthly Bill: ₹12,000
- System: 5kW, 10x Axitec 545W panels, Solis 5kW inverter
- Total: ₹3,50,000 (before subsidy)
- Status: Accepted

Sample 2:
- Client: Priya Nair, JP Nagar, Bengaluru
- Monthly Bill: ₹8,000
- System: 3kW, 6x Axitec 545W panels, Solis 5kW inverter
- Total: ₹2,10,000 (before subsidy)
- Status: Sent

Sample 3:
- Client: Industrial Cold Storage Ltd., Peenya Industrial Area
- Monthly Bill: ₹2,50,000
- System: 100kW, Ground Mount, 184x Waaree 540W, 2x Sungrow 50kW
- Total: ₹65,00,000
- Status: Draft
```

## PRIORITY ORDER

Build in this order:
1. The quotation creation wizard (all 6 steps with auto-calculations)
2. The dashboard with quotation list
3. PDF generation
4. Settings/admin page
5. Polish and responsiveness

Start building now. Begin with the project setup and the quotation wizard.
