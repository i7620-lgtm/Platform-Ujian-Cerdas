import { useEffect, useCallback, useState } from "react";
import { ChartData, ChartDataset, CartesianConfig } from "../../types";

interface UseChartConfigModalProps {
  isOpen: boolean;
  initialData?: ChartData;
  onClose: () => void;
  onSave: (data: ChartData) => void;
}

export const useChartConfigModal = ({
  isOpen,
  initialData,
  onClose,
  onSave,
}: UseChartConfigModalProps) => {
  const [type, setType] = useState<
    "bar" | "line" | "pie" | "venn" | "relation" | "cartesian"
  >(initialData?.type || "bar");
  const [title, setTitle] = useState(initialData?.title || "");
  const [labels, setLabels] = useState<string[]>(initialData?.labels || ["kategori 1"]);
  const [datasets, setDatasets] = useState<ChartDataset[]>(
    initialData?.datasets?.map((d) => ({
      label: d.label,
      data: d.data,
      backgroundColor: d.backgroundColor,
      borderColor: d.borderColor,
      showLine: d.showLine,
      fill: d.fill,
      isFunction: d.isFunction,
      functionStr: d.functionStr,
    })) || [{ label: "Data 1", data: [0] }],
  );
  const [showTooltip, setShowTooltip] = useState(initialData?.showTooltip !== false);
  const [showLegend, setShowLegend] = useState(initialData?.showLegend !== false);
  const [cartesianConfig, setCartesianConfig] = useState<CartesianConfig | undefined>(initialData?.cartesianConfig);

  const resetStore = useCallback(() => {
    setType("bar");
    setTitle("");
    setLabels(["kategori 1"]);
    setDatasets([{ label: "Data 1", data: [0] }]);
    setShowTooltip(true);
    setShowLegend(true);
    setCartesianConfig(undefined);
  }, []);

  const handleTypeChange = useCallback(
    (newTypeStr: string) => {
      const newType = newTypeStr as
        | "bar"
        | "line"
        | "pie"
        | "venn"
        | "relation"
        | "cartesian";
      setType(newType);

      if (newType === "venn") {
        if (labels.length !== 2 && labels.length !== 3) {
          setLabels(["A", "B"]);
          setDatasets([{ label: "Data", data: ["", "", "", "", ""] }]);
        }
      } else if (newType === "relation") {
        setLabels(["A", "B"]);
        setDatasets([
          { label: "Domain", data: ["1", "2", "3"] },
          { label: "Kodomain", data: ["a", "b", "c"] },
          { label: "Relasi", data: ["0-0", "1-1", "2-2"] },
        ]);
      } else if (newType === "cartesian") {
        setLabels(["X", "Y"]);
        setDatasets([
          {
            label: "Titik Data",
            data: [],
            backgroundColor: ["#3b82f6"],
            showLine: false,
          },
        ]);
      }
    },
    [labels.length],
  );

  const handleAddLabel = useCallback(() => {
    setLabels([...labels, `Label ${labels.length + 1}`]);
    setDatasets(datasets.map((d) => ({ ...d, data: [...d.data, 0] })));
  }, [labels, datasets]);

  const handleDeleteLabel = useCallback(
    (index: number) => {
      if (labels.length <= 1) return;
      const newLabels = [...labels];
      newLabels.splice(index, 1);
      setLabels(newLabels);
      setDatasets(
        datasets.map((d) => {
          const newData = [...d.data];
          newData.splice(index, 1);
          return { ...d, data: newData };
        }),
      );
    },
    [labels, datasets],
  );

  const handleAddDataset = useCallback(() => {
    setDatasets([
      ...datasets,
      { label: `Data ${datasets.length + 1}`, data: labels.map(() => 0) },
    ]);
  }, [datasets, labels]);

  const handleDeleteDataset = useCallback(
    (index: number) => {
      if (datasets.length <= 1) return;
      const newDatasets = [...datasets];
      newDatasets.splice(index, 1);
      setDatasets(newDatasets);
    },
    [datasets],
  );

  const handleSave = useCallback(() => {
    onSave({
      type: type as any,
      title: title,
      labels: labels,
      datasets: datasets,
      showTooltip: showTooltip,
      showLegend: showLegend,
      ...(type === "cartesian" ? { cartesianConfig } : {}),
    });
    onClose();
    resetStore();
  }, [
    type,
    title,
    labels,
    datasets,
    showTooltip,
    showLegend,
    cartesianConfig,
    onSave,
    onClose,
    resetStore,
  ]);

  return {
    type,
    title,
    labels,
    datasets,
    showTooltip,
    showLegend,
    cartesianConfig,
    setType,
    setTitle,
    setShowTooltip,
    setShowLegend,
    setLabels,
    setDatasets,
    setCartesianConfig,
    resetStore,
    handleTypeChange,
    handleAddLabel,
    handleDeleteLabel,
    handleAddDataset,
    handleDeleteDataset,
    handleSave,
  };
};
