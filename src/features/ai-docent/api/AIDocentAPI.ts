import axios from "axios";
import type { AIDocentRequest, AIDocentResponse } from "../model/types";

class AIDocentAPI {
  generate(input: AIDocentRequest) {
    return axios.post<AIDocentResponse>("/api/ai-docent", input);
  }
}

export default new AIDocentAPI();
