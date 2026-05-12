import axios from "axios";
import type {
  AssistantChatRequest,
  AssistantChatResponse,
} from "../model/types";

class AssistantChatAPI {
  send(input: AssistantChatRequest) {
    return axios.post<AssistantChatResponse>("/api/assistant-chat", input);
  }
}

export default new AssistantChatAPI();
