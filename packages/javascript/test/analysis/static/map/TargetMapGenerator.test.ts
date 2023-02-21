import { AbstractSyntaxTreeGenerator } from "../../../../lib/analysis/static/ast/AbstractSyntaxTreeGenerator";
import { TargetMapGenerator } from "../../../../lib/analysis/static/map/TargetMapGenerator";

describe("Temp", () => {
  it("temp", () => {
    const target = "test";
    const code = `
    class Test {
        _propertyX  = "example"

        get propertyX() {
            return this._propertyX
        }
        set propertyX(propertyX) {
            this._propertyX = propertyX
        }
    }
    `;
    const ast = new AbstractSyntaxTreeGenerator().generate(code, target);

    const targetMapGenerator = new TargetMapGenerator();
    const { targetMap, functionMap } = targetMapGenerator.generate(target, ast);

    console.log(targetMap);
    console.log(functionMap);
  });
});