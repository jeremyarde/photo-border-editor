import { useEffect, useRef, useState } from "react";

const CANVAS_SIZE = 720;
const CANVAS_PADDING = 40;
const WAVE_STEP = 5;
const DEFAULT_IMAGE_PATH = "src/assets/cat.jpeg";

const styles = {
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    gap: "20px",
  },
  controls: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    minWidth: "300px",
    maxHeight: "80vh",
    overflowY: "auto" as const,
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
  },
  label: {
    fontWeight: "500",
    flex: "1",
    whiteSpace: "nowrap" as const,
  },
  slider: {
    width: "120px",
  },
  button: {
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "13px",
    "&:hover": {
      backgroundColor: "#f0f0f0",
    },
  },
  canvasContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    alignItems: "flex-start",
  },
  borderControl: {
    border: "1px solid #eee",
    borderRadius: "4px",
    padding: "10px",
    marginBottom: "8px",
    backgroundColor: "#f9f9f9",
  },
  borderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  borderTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "500",
  },
  colorInput: {
    width: "50px",
    height: "24px",
    padding: 0,
    border: "1px solid #ccc",
  },
  checkbox: {
    margin: 0,
    marginRight: "4px",
  },
};

interface Border {
  id: string;
  isWavy: boolean;
  waveSize: number;
  frequency: number;
  phase: number;
  borderWidth: number;
  padding: number;
  color: string;
  fillMode: FillMode;
  isFilled: boolean;
  fillColor: string;
}

// Add fill mode type
type FillMode = "inside" | "outside";

function drawWavyBorder(
  ctx: CanvasRenderingContext2D,
  props: { borders: Border[] }
) {
  const { borders } = props;

  function drawWavyPath(params: Border) {
    const offset = params.waveSize + params.borderWidth + params.padding;
    const width = CANVAS_SIZE - offset * 2;
    const height = CANVAS_SIZE - offset * 2;

    if (params.isWavy) {
      ctx.moveTo(offset, offset + params.waveSize * Math.sin(params.phase));

      // Draw all four sides
      const sides = [
        [0, width, "x", "y"],
        [0, height, "y", "x"],
        [width, 0, "x", "y"],
        [height, 0, "y", "x"],
      ];

      sides.forEach(([start, end, mainDim], i) => {
        const step = start < end ? WAVE_STEP : -WAVE_STEP;
        for (
          let pos: number = start as number;
          start < end ? pos <= (end as number) : pos >= (end as number);
          pos += step
        ) {
          const t = pos / (mainDim === "x" ? width : height);
          const wave =
            params.waveSize *
            Math.sin(t * params.frequency * Math.PI + params.phase);

          const x =
            mainDim === "x"
              ? pos + offset
              : i === 1
              ? CANVAS_SIZE - offset + wave
              : offset + wave;
          const y =
            mainDim === "y"
              ? pos + offset
              : i === 2
              ? CANVAS_SIZE - offset + wave
              : offset + wave;

          ctx.lineTo(x, y);
        }
      });
    } else {
      ctx.rect(offset, offset, width, height);
    }
  }

  // Draw each border
  borders.forEach((border) => {
    ctx.beginPath();

    // For outside fill, draw the outer rectangle first
    if (border.isFilled && border.fillMode === "outside") {
      ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    // Draw the border path
    drawWavyPath(border);
    ctx.closePath();

    // Set styles for this border
    ctx.lineWidth = border.borderWidth;
    ctx.strokeStyle = border.color;

    // Handle fill if needed
    if (border.isFilled) {
      ctx.fillStyle = border.fillColor;
      ctx.fill(border.fillMode === "outside" ? "evenodd" : "nonzero");
    }

    // Draw the border
    ctx.stroke();
  });
}

export default function PhotoBorderEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(
    null
  );
  const [borders, setBorders] = useState<Border[]>([
    {
      id: "border-1",
      isWavy: true,
      waveSize: 10,
      frequency: 10,
      phase: 0,
      borderWidth: 3,
      padding: 40,
      color: "#000000",
      fillMode: "outside",
      isFilled: false,
      fillColor: "#ffffff",
    },
  ]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    canvasRef.current.width = CANVAS_SIZE;
    canvasRef.current.height = CANVAS_SIZE;
    context.fillStyle = "white";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    setCtx(context);
  }, []);

  useEffect(() => {
    if (!ctx || !canvasRef.current) return;

    const img = new Image();
    img.onload = function () {
      clearCanvas();

      const scale = Math.min(
        (CANVAS_SIZE - CANVAS_PADDING) / img.width,
        (CANVAS_SIZE - CANVAS_PADDING) / img.height
      );

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (CANVAS_SIZE - scaledWidth) / 2;
      const y = (CANVAS_SIZE - scaledHeight) / 2;

      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      setOriginalImageData(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
      addWavyBorder();
    };
    img.src = DEFAULT_IMAGE_PATH;
  }, [ctx]);

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  };

  function addImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !ctx || !canvasRef.current) return;

    const reader = new FileReader();
    reader.onload = function (e: ProgressEvent<FileReader>) {
      const result = e.target?.result;
      if (typeof result !== "string") return;

      const img = new Image();
      img.onload = function () {
        clearCanvas();

        const scale = Math.min(
          (CANVAS_SIZE - CANVAS_PADDING) / img.width,
          (CANVAS_SIZE - CANVAS_PADDING) / img.height
        );

        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (CANVAS_SIZE - scaledWidth) / 2;
        const y = (CANVAS_SIZE - scaledHeight) / 2;

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        setOriginalImageData(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
        addWavyBorder();
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  function addWavyBorder() {
    if (!ctx) return;
    drawWavyBorder(ctx, {
      borders,
    });
  }

  function downloadImage() {
    if (!canvasRef.current || !ctx) return;

    // Store current canvas content
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Create temporary canvas with white background
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = CANVAS_SIZE;
    tempCanvas.height = CANVAS_SIZE;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Fill with white background
    tempCtx.fillStyle = "white";
    tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw our image on top
    tempCtx.putImageData(imageData, 0, 0);

    // Save from temporary canvas
    tempCanvas.toBlob((blob: Blob | null) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "wavy-bordered-image.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  const addBorder = () => {
    setBorders([
      ...borders,
      {
        id: `border-${borders.length + 1}`,
        isWavy: true,
        waveSize: 10,
        frequency: 10,
        phase: 0,
        borderWidth: 3,
        padding: 40,
        color: "#000000",
        fillMode: "outside",
        isFilled: false,
        fillColor: "#ffffff",
      },
    ]);
  };

  const updateBorder = (index: number, newBorder: Border) => {
    const newBorders = [...borders];
    newBorders[index] = newBorder;
    setBorders(newBorders);

    if (originalImageData && ctx) {
      clearCanvas();
      ctx.putImageData(originalImageData, 0, 0);
      drawWavyBorder(ctx, {
        borders: newBorders,
      });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        <button style={styles.button} onClick={addBorder}>
          Add New Border
        </button>

        {borders.map((border, index) => (
          <div key={border.id} style={styles.borderControl}>
            <div style={styles.borderHeader}>
              <h3 style={styles.borderTitle}>Border {index + 1}</h3>
              <button
                style={styles.button}
                onClick={() =>
                  setBorders(borders.filter((b) => b.id !== border.id))
                }
              >
                Remove
              </button>
            </div>

            <div style={styles.controlGroup}>
              <button
                style={styles.button}
                onClick={() => {
                  updateBorder(index, {
                    ...border,
                    isWavy: !border.isWavy,
                  });
                }}
              >
                {border.isWavy ? "Use Square Border" : "Use Wavy Border"}
              </button>
            </div>

            {border.isWavy && (
              <>
                <div style={styles.controlGroup}>
                  <label style={styles.label}>
                    Wave Size: {border.waveSize}
                  </label>
                  <input
                    style={styles.slider}
                    type="range"
                    min="1"
                    max="50"
                    value={border.waveSize}
                    onChange={(e) => {
                      updateBorder(index, {
                        ...border,
                        waveSize: Number(e.target.value),
                      });
                    }}
                  />
                </div>
                <div style={styles.controlGroup}>
                  <label style={styles.label}>
                    Frequency: {border.frequency}
                  </label>
                  <input
                    style={styles.slider}
                    type="range"
                    min="1"
                    max="20"
                    value={border.frequency}
                    onChange={(e) => {
                      updateBorder(index, {
                        ...border,
                        frequency: Number(e.target.value),
                      });
                    }}
                  />
                </div>
                <div style={styles.controlGroup}>
                  <label style={styles.label}>
                    Phase: {border.phase.toFixed(2)}
                  </label>
                  <input
                    style={styles.slider}
                    type="range"
                    min="0"
                    max={2 * Math.PI}
                    step="0.1"
                    value={border.phase}
                    onChange={(e) => {
                      updateBorder(index, {
                        ...border,
                        phase: Number(e.target.value),
                      });
                    }}
                  />
                </div>
                <div style={styles.controlGroup}>
                  <label style={styles.label}>
                    Border Width: {border.borderWidth}
                  </label>
                  <input
                    style={styles.slider}
                    type="range"
                    min="1"
                    max="10"
                    value={border.borderWidth}
                    onChange={(e) => {
                      updateBorder(index, {
                        ...border,
                        borderWidth: Number(e.target.value),
                      });
                    }}
                  />
                </div>
                <div style={styles.controlGroup}>
                  <label style={styles.label}>Padding: {border.padding}</label>
                  <input
                    style={styles.slider}
                    type="range"
                    min="1"
                    max="100"
                    value={border.padding}
                    onChange={(e) => {
                      updateBorder(index, {
                        ...border,
                        padding: Number(e.target.value),
                      });
                    }}
                  />
                </div>
              </>
            )}
            <div style={styles.controlGroup}>
              <label style={styles.label}>Border Color</label>
              <input
                type="color"
                style={styles.colorInput}
                value={border.color}
                onChange={(e) => {
                  updateBorder(index, {
                    ...border,
                    color: e.target.value,
                  });
                }}
              />
            </div>
            <div style={styles.controlGroup}>
              <button
                style={styles.button}
                onClick={() => {
                  updateBorder(index, {
                    ...border,
                    isFilled: !border.isFilled,
                  });
                }}
              >
                {border.isFilled ? "Remove Fill" : "Add Fill"}
              </button>
            </div>
            {border.isFilled && (
              <>
                <div style={styles.controlGroup}>
                  <label style={styles.label}>Fill Color</label>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={border.fillColor}
                    onChange={(e) => {
                      updateBorder(index, {
                        ...border,
                        fillColor: e.target.value,
                      });
                    }}
                  />
                </div>
                <div style={styles.controlGroup}>
                  <label style={styles.label}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={border.fillMode === "outside"}
                      onChange={(e) => {
                        updateBorder(index, {
                          ...border,
                          fillMode: e.target.checked ? "outside" : "inside",
                        });
                      }}
                    />
                    Fill Outside
                  </label>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div style={styles.canvasContainer}>
        <input type="file" onChange={addImage} accept="image/*" />
        <button style={styles.button} onClick={downloadImage}>
          Download Image
        </button>
        <div style={{ border: "1px solid #ccc", lineHeight: 0 }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
