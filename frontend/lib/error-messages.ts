// frontend/lib/error-messages.ts
import axios from "axios";

type ErrorContext =
  | "auth-login"
  | "auth-register"
  | "project-create"
  | "project-delete"
  | "project-update"
  | "project-upload"
  | "project-download"
  | "project-process"
  | "project-cancel-process"
  | "project-load"           
  | "billing"
  | "upgrade"
  | "ai"
  | "account-profile"     
  | "account-password" 
  | "generic"
  | "assistant-suggest"
  | "project-reorder";


type ErrorInfo = {
  title: string;
  description: string;
};

export function getErrorMessage(
  context: ErrorContext,
  error?: unknown,
): ErrorInfo {
  // 1) Erros de rede (sem resposta)
  if (axios.isAxiosError(error) && !error.response) {
    return {
      title: "Sem ligação à internet",
      description:
        "Não foi possível comunicar com o servidor. Verifica a tua ligação e tenta novamente.",
    };
  }

  // 2) Mensagem vinda do backend (string simples)
  const backendMsg =
    axios.isAxiosError(error) && typeof error.response?.data === "string"
      ? error.response?.data
      : undefined;

  // Exemplos de códigos / mensagens do backend que já vi no código
  if (backendMsg === "No more daily_operations available") {
    return {
      title: "Limite diário atingido",
      description:
        "Atingiste o limite diário de operações avançadas. Volta a tentar amanhã ou faz upgrade para Premium.",
    };
  }

  // Ir acrescentando aqui outros códigos específicos do backend
  // if (backendMsg === "Invalid credentials") { ... }

  // 3) Contextos específicos
  switch (context) {
    case "auth-login":
      return {
        title: "Erro no login",
        description:
          backendMsg ??
          "Não foi possível iniciar sessão. Verifica as credenciais e tenta novamente.",
      };

    case "auth-register":
      return {
        title: "Erro no registo",
        description:
          backendMsg ??
          "Não foi possível concluir o registo. Verifica os dados inseridos e tenta novamente.",
      };

    case "project-create":
      return {
        title: "Erro ao criar projeto",
        description:
          backendMsg ??
          "Ocorreu um problema ao criar o projeto. Verifica a tua ligação e tenta novamente.",
      };

    case "project-upload":
      return {
        title: "Erro ao carregar imagens",
        description:
          backendMsg ??
          "As imagens não foram carregadas. Confirma o formato e o tamanho dos ficheiros e tenta novamente.",
      };

    case "project-download":
      return {
        title: "Erro no download",
        description:
          backendMsg ??
          "Não foi possível fazer o download do projeto. Tenta novamente mais tarde.",
      };

    case "project-process":
      return {
        title: "Falha no processamento",
        description:
          backendMsg ??
          "Ocorreu um erro ao processar o projeto. Tenta novamente. Se o problema persistir, verifica a tua ligação ou volta a tentar mais tarde.",
      };

    case "project-cancel-process":
      return {
        title: "Não foi possível cancelar o processamento",
        description:
          backendMsg ??
          "O cancelamento do processamento falhou. Verifica a tua ligação e tenta novamente.",
      };

    case "account-profile":
      return {
        title: "Erro ao atualizar perfil",
        description:
          backendMsg ??
          "Não foi possível atualizar os dados do perfil. Verifica a informação inserida e tenta novamente.",
      };

    case "account-password":
      return {
        title: "Erro ao atualizar password",
        description:
          backendMsg ??
          "Não foi possível atualizar a password. Confirma a password atual e tenta novamente.",
      };


    case "upgrade":
      return {
        title: "Erro ao atualizar o plano",
        description:
          backendMsg ??
          "Ocorreu um erro ao alterar o plano de subscrição. Tenta novamente.",
      };
    
    case "billing":
      return {
        title: "Erro na faturação",
        description:
          backendMsg ??
          "Ocorreu um erro ao gerir a tua subscrição ou método de pagamento. Verifica os dados e tenta novamente.",
      };

    case "ai":
      return {
        title: "Falha na IA",
        description:
          backendMsg ??
          "Não foi possível gerar sugestões da IA. Tenta novamente. Se o problema continuar, verifica a tua ligação à internet.",
      };

    case "project-load":
      return {
        title: "Erro ao carregar projeto",
        description:
          backendMsg ??
          "Não foi possível carregar o projeto. Verifica a tua ligação e tenta novamente.",
      };

    case "assistant-suggest":
      return {
        title: "Falha no processamento",
        description: "Falha no processamento. Tente novamente.",

      };

    case "project-reorder":
      return {
        title: "Erro ao aplicar sugestão",
        description:
          backendMsg ??
          "Não foi possível atualizar a sequência de ferramentas. Tenta novamente.",
      };

    default:
      return {
        title: "Ocorreu um erro",
        description:
          backendMsg ??
          "Algo correu mal. Tenta novamente ou volta a tentar mais tarde.",
      };
  }
}

// Códigos de erro que vêm das tools de IA (bg_remove_ai, cut_ai, upgrade_ai, obj_ai, people_ai, text_ai)
// Por agora podes ter mensagens genéricas e depois refinas se o prof pedir algo mais específico
export function getAiErrorMessage(
  code?: number,
  backendMsg?: string,
): ErrorInfo {
  if (code != null) {
    switch (code) {
      case 1100: // bg_remove_ai wrong_procedure
      case 1101: // bg_remove_ai error_processing
        return {
          title: "Erro na remoção de fundo",
          description:
            "Não foi possível remover o fundo desta imagem. Tenta novamente ou experimenta outra imagem.",
        };

      case 1800: // upgrade_ai wrong_procedure
      case 1801: // upgrade_ai error_processing
        return {
          title: "Erro na melhoria da imagem",
          description:
            "Não foi possível melhorar esta imagem. Verifica o formato/tamanho e tenta novamente.",
        };

      case 2000: // cut_ai wrong_procedure
      case 2001: // cut_ai error_processing
        return {
          title: "Erro no corte inteligente",
          description:
            "Não foi possível calcular o corte inteligente para esta imagem. Tenta novamente ou ajusta a imagem original.",
        };

      case 2100: // obj_ai wrong_procedure
      case 2101: // obj_ai error_processing
        return {
          title: "Erro na deteção de objetos",
          description:
            "Não foi possível detetar objetos na imagem. Tenta novamente ou usa outra imagem com mais contraste.",
        };

      // Se tiveres códigos extra dos outros serviços (people_ai, text_ai), vais só acrescentando aqui.
    }
  }

  // fallback genérico
  return {
    title: "Falha na IA",
    description:
      backendMsg ??
      "Não foi possível aplicar a ferramenta de IA. Tenta novamente. Se o problema continuar, verifica a tua ligação à internet ou volta a tentar mais tarde.",
  };
}
