import { JavaScriptTestCase } from "../../../testcase/JavaScriptTestCase";
import { Statement } from "../../../testcase/statements/Statement";


export default class ExecutionInformationIntegrator {
  processSuccess(testCase: JavaScriptTestCase, testResult: any) {

  }

  processError(testCase: JavaScriptTestCase, testResult: any) {
    const queue: Statement[] = [testCase.root]

    while (queue.length) {
      const root = queue.pop()
      const children = root.getChildren()

      for (const child of children) {
        if (testResult.err.message.includes(child.identifierDescription.name)) {
          child.identifierDescription.typeProbabilityMap.addExecutionScore(child.type, -1)
        }
        queue.push(child)
      }
    }
  }
}
