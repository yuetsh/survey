import type { GlobalThemeOverrides } from "naive-ui"

// 学生反馈"眼花"：字太小、行太挤。这里统一放大字号、撑开单元格留白、
// 把网格线压淡，让视线能一行行走下去。
export const themeOverrides: GlobalThemeOverrides = {
  common: { fontSize: "15px", fontSizeMedium: "15px" },
  DataTable: {
    fontSizeMedium: "15px",
    thPaddingMedium: "14px 16px",
    tdPaddingMedium: "16px 16px",
    thFontWeight: "600",
    borderColor: "#eceef1",
    thColor: "#fafbfc",
  },
}
