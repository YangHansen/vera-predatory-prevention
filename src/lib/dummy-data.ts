import type { Policy } from "@/types";

export const DUMMY_POLICIES: Policy[] = [
  {
    id: "pol_retiresafe_sg",
    code: "VERA-RET-SG01",
    name: "RetireSafe Golden Shield (Annuity & Life Protection)",
    provider: "Vera Life Assurance (Singapore) Pte. Ltd.",
    type: "TERM_LIFE",
    premiumAmount: 450, // SGD per month
    premiumFrequency: "monthly",
    coverageAmount: 250000, // S$250,000
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
    id: "pol_futurecare_sg",
    code: "VERA-HLT-SG02",
    name: "FutureCare Elite (Comprehensive Hospital & Surgical)",
    provider: "Vera Health Shield Singapore",
    type: "HEALTH_CARE",
    premiumAmount: 220, // SGD per month
    premiumFrequency: "monthly",
    coverageAmount: 1000000, // S$1,000,000 annual limit
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
    ],
  },
];

export function getPolicyById(id: string): Policy | undefined {
  return DUMMY_POLICIES.find((p) => p.id === id || p.code.toLowerCase() === id.toLowerCase());
}

export function getDefaultPolicy(): Policy {
  return DUMMY_POLICIES[0];
}
