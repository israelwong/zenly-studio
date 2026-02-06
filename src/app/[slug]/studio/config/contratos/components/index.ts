// Exports centralizados para componentes de contratos

export { ContractEditor } from "./ContractEditor";
export type { ContractEditorRef } from "./ContractEditor";
export { ContractPreview } from "@/components/shared/contracts/ContractPreview";
export { ContractEditorToolbar } from "./ContractEditorToolbar";
export { VariableAutocomplete } from "./VariableAutocomplete";
export { VariableBadge } from "./VariableBadge";
export { CotizacionBlock } from "./CotizacionBlock";
export { CondicionesComercialesBlock } from "./CondicionesComercialesBlock";
export { ContractTemplateCard } from "./ContractTemplate";
export { ContractTemplatesTable } from "./ContractTemplatesTable";
export type { ContractTemplateProps } from "./ContractTemplate";
export type { ContractTemplatesTableProps } from "./ContractTemplatesTable";

export type {
  ContractVariable,
  CotizacionRenderData,
  CondicionesComercialesData,
  ParsedVariable,
} from "@/components/shared/contracts/types";

export {
  parseVariables,
  getVariableAtCursor,
  filterVariables,
  normalizeVariableKey,
  formatVariable,
} from "./utils/variable-utils";

export {
  renderCotizacionBlock,
  renderCondicionesComercialesBlock,
} from "@/components/shared/contracts/utils/contract-renderer";

