import type { Policy } from "@/types";

export const DUMMY_POLICIES: Policy[] = [
  {
    id: "pol_retiresafe_sg",
    code: "VERA-RET-SG01",
    name: "RetireSafe Golden Shield (Annuity & Life Protection)",
    provider: "Vera Life Assurance (Singapore) Pte. Ltd.",
    type: "ENDOWMENT",
    tagline: "Guaranteed retirement income stream with immediate life & TPD cover",
    premiumAmount: 450, // SGD per month
    premiumFrequency: "monthly",
    coverageAmount: 250000, // S$250,000
    isGuaranteedReturn: true,
    projectedReturnRate: "3.25% p.a. (Guaranteed)",
    surrenderPenaltyPeriodMonths: 36,
    surrenderPenaltyPercent: 15,
    simplifiedSummary: [
      "Guaranteed monthly annuity payout starting at age 62 for 20 consecutive years.",
      "Immediate S$250,000 life and total permanent disability (TPD) coverage upon initial policy activation.",
      "Early surrender within the first 36 months incurs an administrative penalty of 15% on total surrender value.",
      "Pre-existing critical medical conditions are covered only after a mandatory 12-month waiting period."
    ],
    clauses: [
      {
        id: "cl_1",
        title: "Guaranteed Annuity Stream",
        originalText:
          "The policyholder shall be entitled to guaranteed monthly annuity disbursements commencing on the first business day following their 62nd birthday, amortized over a 240-month structured annuity term governed by MAS Market Conduct guidelines.",
        simplifiedBullet: "Guaranteed monthly annuity payout starting at age 62 for 20 consecutive years.",
        category: "payout",
        isCritical: true,
      },
      {
        id: "cl_2",
        title: "Death & Total Permanent Disability (TPD) Benefit",
        originalText:
          "Upon certified proof of mortality or irreversible Total Permanent Disability of the life assured, the appointed beneficiaries shall be disbursed 100% of the guaranteed sum assured (SGD 250,000) under standard Singapore insurance trust provisions.",
        simplifiedBullet: "Immediate S$250,000 life and total permanent disability (TPD) coverage upon initial policy activation.",
        category: "coverage",
        isCritical: true,
      },
      {
        id: "cl_3",
        title: "Early Surrender & Administrative Deductions",
        originalText:
          "In the event of contract termination or policy liquidation prior to 36 consecutive monthly amortizations, an administrative penalty coefficient of 15% shall be deducted from total accrued surrender capital.",
        simplifiedBullet: "Early surrender within the first 3 years incurs a 15% administrative fee.",
        category: "surrender",
        isCritical: true,
      },
      {
        id: "cl_4",
        title: "Pre-existing Medical Condition Moratorium",
        originalText:
          "Any chronic cardiovascular pathologies, oncology indications, or diagnosed pre-existing ailments prior to policy inception are subject to a strict 365-day exclusionary waiting period.",
        simplifiedBullet: "Pre-existing critical conditions are covered only after a 12-month waiting period.",
        category: "exclusion",
        isCritical: true,
      },
    ],
  },
  {
    id: "pol_wealthbuilder_sg",
    code: "VERA-ILP-SG03",
    name: "WealthBuilder Horizon (Unit-Linked Investment Plan)",
    provider: "Vera Asset & Wealth Assurance Pte. Ltd.",
    type: "UNIT_LINK",
    tagline: "Market-linked investment growth with flexible fund switching and dividend distribution",
    premiumAmount: 600, // SGD per month
    premiumFrequency: "monthly",
    coverageAmount: 300000,
    isGuaranteedReturn: false,
    projectedReturnRate: "4.25% - 8.00% p.a. (Non-Guaranteed illustrated yield)",
    surrenderPenaltyPeriodMonths: 60,
    surrenderPenaltyPercent: 25,
    simplifiedSummary: [
      "Returns are strictly non-guaranteed and fluctuate based on underlying MAS-approved equity & bond sub-funds.",
      "5-year structured lock-in period with declining surrender charge (up to 25% if liquidated in Year 1).",
      "Death benefit pays the higher of basic sum assured (S$300,000) or total account portfolio market value.",
      "Customer retains full right to reallocate sub-funds with zero switching transaction charges."
    ],
    clauses: [
      {
        id: "cl_21",
        title: "Market Risk & Non-Guaranteed Valuation",
        originalText:
          "The investment returns and capital value of units linked to this policy are subject to market volatility and are strictly non-guaranteed. The policyholder bears the full investment risk under MAS Notice 307.",
        simplifiedBullet: "Returns are non-guaranteed and market-linked; investment capital can fluctuate.",
        category: "payout",
        isCritical: true,
      },
      {
        id: "cl_22",
        title: "Structured Lock-in & Surrender Charge Schedule",
        originalText:
          "Liquidation or total surrender executed within 60 calendar months from inception shall be assessed a front-end surrender charge ranging from 25% in Year 1 amortizing to 5% in Year 5.",
        simplifiedBullet: "5-year lock-in period with up to 25% surrender charge if liquidated prematurely.",
        category: "surrender",
        isCritical: true,
      },
      {
        id: "cl_23",
        title: "Account Value Protection & Death Settlement",
        originalText:
          "Upon deceased certification of the insured party, the benefit payable shall be evaluated as the greater of Sum Assured SGD 300,000 or prevailing Unit Account Value minus any unamortized policy charges.",
        simplifiedBullet: "Pays the higher of S$300,000 or current portfolio value upon death.",
        category: "coverage",
        isCritical: true,
      },
    ],
  },
  {
    id: "pol_prulife_term_sg",
    code: "VERA-TRM-SG04",
    name: "PruLife Term Protect 2026 (Pure Protection Term Life)",
    provider: "Vera Life Assurance (Singapore) Pte. Ltd.",
    type: "TERM_LIFE",
    tagline: "High-sum affordable pure death & TPD protection with guaranteed level premiums",
    premiumAmount: 110, // SGD per month
    premiumFrequency: "monthly",
    coverageAmount: 1000000, // S$1,000,000
    isGuaranteedReturn: false,
    projectedReturnRate: "N/A (Pure Protection - Zero Cash Surrender Value)",
    surrenderPenaltyPeriodMonths: 0,
    surrenderPenaltyPercent: 0,
    simplifiedSummary: [
      "Pure protection policy providing S$1,000,000 coverage against Death, Terminal Illness, and Total Permanent Disability.",
      "Zero cash accumulation or surrender value upon early termination (all premiums go toward risk coverage).",
      "Guaranteed renewable annually without additional medical underwriting up to age 75.",
      "Strict exclusion for intentional self-harm or suicide within the first 12 months."
    ],
    clauses: [
      {
        id: "cl_31",
        title: "Pure Risk Indemnity & Absence of Cash Value",
        originalText:
          "This policy operates strictly as a level term risk contract without any cash endowment accumulation, profit participation, or surrender redemption value at any point during the policy tenure.",
        simplifiedBullet: "Pure protection policy: No savings or cash value upon cancellation.",
        category: "payout",
        isCritical: true,
      },
      {
        id: "cl_32",
        title: "Sum Assured Disbursement",
        originalText:
          "In the event of verified death, terminal illness diagnosis (<12 months prognosis), or total permanent disability, S$1,000,000 shall be disbursed directly to named beneficiaries.",
        simplifiedBullet: "S$1,000,000 lump sum payout on death, terminal illness, or permanent disability.",
        category: "coverage",
        isCritical: true,
      },
      {
        id: "cl_33",
        title: "Suicide & Unlawful Act Exclusion",
        originalText:
          "No benefit will be indemnified if death results directly or indirectly from intentional suicide or self-inflicted injury within 365 days of policy commencement.",
        simplifiedBullet: "Suicide or self-harm is strictly excluded within the first 12 months.",
        category: "exclusion",
        isCritical: true,
      },
    ],
  },
  {
    id: "pol_futurecare_sg",
    code: "VERA-HLT-SG02",
    name: "FutureCare Elite (Comprehensive Hospital & Surgical)",
    provider: "Vera Health Shield Singapore",
    type: "HEALTH_CARE",
    tagline: "As-charged private hospital and specialist surgical shield with S$1M annual limit",
    premiumAmount: 220, // SGD per month
    premiumFrequency: "monthly",
    coverageAmount: 1000000, // S$1,000,000 annual limit
    isGuaranteedReturn: false,
    projectedReturnRate: "N/A (Medical Expense Indemnity)",
    surrenderPenaltyPeriodMonths: 0,
    surrenderPenaltyPercent: 0,
    simplifiedSummary: [
      "Cashless hospital admission across all Singapore restructured and private partner hospitals.",
      "100% coverage for in-patient hospital room, intensive care unit (ICU), and prescribed post-hospitalization rehabilitation.",
      "Elective cosmetic procedures and experimental non-HSA approved drugs are strictly excluded.",
      "Annual claim limit capped at S$1,000,000 with lifetime coverage up to age 100."
    ],
    clauses: [
      {
        id: "cl_11",
        title: "In-Patient Hospitalization & Surgical Cover",
        originalText:
          "Direct settlement and letter of guarantee (LOG) for accredited medical institutions across Singapore up to Class A single-bed ward entitlement.",
        simplifiedBullet: "Cashless hospital admission across all Singapore restructured and private partner hospitals.",
        category: "coverage",
        isCritical: true,
      },
      {
        id: "cl_12",
        title: "Exclusion of Elective & Uncertified Treatments",
        originalText:
          "Elective aesthetic enhancements, non-emergency treatments, and experimental medications not approved by the Health Sciences Authority (HSA) shall not be indemnified under this schedule.",
        simplifiedBullet: "Elective cosmetic procedures and experimental non-HSA approved drugs are strictly excluded.",
        category: "exclusion",
        isCritical: true,
      },
      {
        id: "cl_13",
        title: "Deductible & Co-payment Mandate",
        originalText:
          "Claims are subject to a standard S$3,000 annual deductible and a mandatory 5% co-payment coefficient capped at S$3,000 per policy year under MAS/MOH Integrated Shield guidelines.",
        simplifiedBullet: "S$3,000 annual deductible and 5% co-pay capped at S$3,000/year under MOH guidelines.",
        category: "premium",
        isCritical: true,
      },
    ],
  },
];

export function getPolicyById(id: string): Policy | undefined {
  return DUMMY_POLICIES.find(
    (p) => p.id.toLowerCase() === id.toLowerCase() || p.code.toLowerCase() === id.toLowerCase()
  );
}

export function getDefaultPolicy(): Policy {
  return DUMMY_POLICIES[0];
}

export function listPolicies(): Policy[] {
  return DUMMY_POLICIES;
}
