import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

import Layout from "../../components/layout";
import ProjectCard from "../../components/ProjectCard/ProjectCard";
import CompatibilityPanel from "../../components/CompatibilityPanel/CompatibilityPanel";
import DashboardStats from "../../components/DashboardStats/DashboardStats";
import "./Dashboard.css";

const ProjectDrawer = lazy(() => import("../../components/ProjectDrawer/ProjectDrawer"));
const TasksChart = lazy(() => import("../../components/TasksChart/TasksChart"));
const TopProjects = lazy(() => import("../../components/TopProjects/TopProjects"));
const AttentionProjects = lazy(
  () => import("../../components/AttentionProjects/AttentionProjects")
);
const RedmineProjectsMonitor = lazy(
  () => import("../../components/RedmineProjectsMonitor/RedmineProjectsMonitor")
);

import type { Project } from "../../types/project";
import type { ReleaseEnvironment } from "../../types/releaseEnvironment";

import {
  listarAmbientes,
  obterAmbienteMaisRecente,
  ordenarAmbientesPorVersao,
} from "../../services/ReleaseEnvironmentService";
import {
  listarProjetosPorAmbiente,
  salvarProjetoNoAmbiente,
  sincronizarProjetosComRedmine,
} from "../../services/ReleaseProjectService";
import { buscarSessao } from "../../services/AuthService";
import {
  daysWithoutMovement,
  INACTIVITY_WARNING_DAYS,
  isProjectInactive,
  isProjectOverdue,
  isProjectUnderObservation,
  parseBrazilianDate,
  parseProjectTimestamp,
} from "../../utils/projectMonitoring";

const STORAGE_KEY = "releasehub_dashboard_environment";

interface MensagemRedmine {
  tipo: "success" | "error";
  texto: string;
  detalhes?: string;
}

interface FilterDefinition {
  value: string;
  label: string;
  count: number;
  matches: (project: Project) => boolean;
}

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function CollapsibleSection({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <section className={`dashboard-section ${open ? "" : "dashboard-section-closed"}`}>
      <button
        type="button"
        className="dashboard-section-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>

        {open ? <MdExpandLess size={22} /> : <MdExpandMore size={22} />}
      </button>

      {open && <div className="dashboard-section-content">{children}</div>}
    </section>
  );
}

function totalTasks(project: Project): number {
  return Object.values(project.situacoes).reduce((total, value) => total + value, 0);
}

function deadlineTimestamp(deadline: string): number {
  const brazilian = parseBrazilianDate(deadline);
  if (brazilian) return brazilian.getTime();

  const parsed = new Date(deadline);
  return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ambientes, setAmbientes] = useState<ReleaseEnvironment[]>([]);
  const [ambienteSelecionadoId, setAmbienteSelecionadoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoAmbientes, setCarregandoAmbientes] = useState(true);
  const [podeEditar, setPodeEditar] = useState(false);
  const [projectSelecionado, setProjectSelecionado] = useState<Project | null>(null);
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [ordenacao, setOrdenacao] = useState("Nome");
  const [sincronizandoRedmine, setSincronizandoRedmine] = useState(false);
  const [mensagemRedmine, setMensagemRedmine] = useState<MensagemRedmine | null>(null);
  const [paineis, setPaineis] = useState({
    compatibilidade: true,
    analises: true,
    observacao: true,
  });

  useEffect(() => {
    let ativo = true;

    async function carregarAmbientes() {
      try {
        const lista = await listarAmbientes();
        if (!ativo) return;

        const ordenados = ordenarAmbientesPorVersao(lista);
        setAmbientes(ordenados);

        const salvo = localStorage.getItem(STORAGE_KEY);
        const idSalvo = salvo ? Number(salvo) : null;
        const salvoExiste =
          idSalvo !== null && ordenados.some(ambiente => ambiente.id === idSalvo);

        if (salvoExiste && idSalvo !== null) {
          setAmbienteSelecionadoId(idSalvo);
          return;
        }

        const maisRecente = obterAmbienteMaisRecente(ordenados);
        if (maisRecente) {
          setAmbienteSelecionadoId(maisRecente.id);
          localStorage.setItem(STORAGE_KEY, String(maisRecente.id));
        }
      } catch (erro) {
        console.error("Erro ao carregar ambientes:", erro);
      } finally {
        if (ativo) setCarregandoAmbientes(false);
      }
    }

    void carregarAmbientes();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarPermissao() {
      try {
        const usuario = await buscarSessao();
        if (!ativo) return;

        setPodeEditar(usuario?.role === "admin" || usuario?.role === "qualidade");
      } catch (erro) {
        console.error("Erro ao carregar permissão:", erro);
        if (ativo) setPodeEditar(false);
      }
    }

    void carregarPermissao();
    return () => {
      ativo = false;
    };
  }, []);

  async function carregarProjetos(environmentId: number) {
    try {
      setCarregando(true);
      const lista = await listarProjetosPorAmbiente(environmentId);
      setProjects(lista);
    } catch (erro) {
      console.error("Erro ao carregar projetos da release:", erro);
      setProjects([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (ambienteSelecionadoId === null) {
      setProjects([]);
      setCarregando(false);
      return;
    }

    void carregarProjetos(ambienteSelecionadoId);
  }, [ambienteSelecionadoId]);

  const ambienteSelecionado = ambientes.find(
    ambiente => ambiente.id === ambienteSelecionadoId
  );
  const concluido = Boolean(ambienteSelecionado?.concluido);

  function alterarAmbiente(id: number) {
    setProjectSelecionado(null);
    setMensagemRedmine(null);
    setPesquisa("");
    setFiltro("Todos");
    setOrdenacao("Nome");
    setProjects([]);
    setCarregando(true);
    setAmbienteSelecionadoId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  async function salvarProjeto(project: Project) {
    if (!podeEditar || ambienteSelecionadoId === null) return;

    try {
      await salvarProjetoNoAmbiente(ambienteSelecionadoId, project);
      await carregarProjetos(ambienteSelecionadoId);
      setProjectSelecionado(null);
    } catch (erro) {
      console.error("Erro ao salvar projeto da release:", erro);
      alert("Não foi possível salvar o projeto desta release.");
    }
  }

  async function sincronizarRedmine() {
    if (!podeEditar || ambienteSelecionadoId === null || sincronizandoRedmine) return;

    const environmentId = ambienteSelecionadoId;

    try {
      setSincronizandoRedmine(true);
      setMensagemRedmine(null);

      const resultado = await sincronizarProjetosComRedmine(environmentId);
      await carregarProjetos(environmentId);

      const ignorados = resultado.projetosIgnorados.length;
      const statusIgnorados = resultado.statusIgnorados.reduce(
        (total, status) => total + status.quantidade,
        0
      );

      let texto = `${resultado.tarefasSincronizadas} tarefas sincronizadas em ${resultado.projetosAtualizados} projetos.`;

      if (ignorados > 0) texto += ` ${ignorados} projetos não foram atualizados.`;
      if (statusIgnorados > 0) {
        texto += ` ${statusIgnorados} tarefas possuem situações ainda não mapeadas.`;
      }

      const detalhes = [
        ...resultado.projetosIgnorados.map(item => `${item.projeto}: ${item.motivo}`),
        ...resultado.statusIgnorados.map(item => `${item.status}: ${item.quantidade}`),
      ].join("\n");

      setMensagemRedmine({
        tipo: "success",
        texto,
        detalhes: detalhes || undefined,
      });
    } catch (erro) {
      console.error("Erro ao sincronizar Redmine:", erro);
      setMensagemRedmine({
        tipo: "error",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível sincronizar os dados com o Redmine.",
      });
    } finally {
      setSincronizandoRedmine(false);
    }
  }

  const filtrosDinamicos = useMemo<FilterDefinition[]>(() => {
    const somar = (campo: keyof Project["situacoes"]) =>
      projects.reduce((total, project) => total + project.situacoes[campo], 0);

    const status: Array<{
      value: string;
      label: string;
      field: keyof Project["situacoes"];
    }> = [
      { value: "Nova", label: "Nova", field: "nova" },
      { value: "Em Progresso", label: "Em Progresso", field: "emProgresso" },
      { value: "Desenvolvido", label: "Desenvolvido", field: "desenvolvido" },
      { value: "Aguard. Comp.", label: "Aguardando Compilação", field: "aguardandoCompilacao" },
      { value: "Qualidade", label: "Qualidade", field: "qualidade" },
      { value: "Testes", label: "Testes", field: "testes" },
      { value: "Reaberta", label: "Reaberta", field: "reaberta" },
      { value: "Validação no Cliente", label: "Validação no Cliente", field: "validacaoCliente" },
      { value: "Rejeitada", label: "Rejeitada", field: "rejeitada" },
      { value: "Interrompida", label: "Interrompida", field: "interrompida" },
      { value: "Resolvidas", label: "Resolvidas", field: "resolvidas" },
    ];

    const definitions: FilterDefinition[] = status.map(item => ({
      value: item.value,
      label: item.label,
      count: somar(item.field),
      matches: project => project.situacoes[item.field] > 0,
    }));

    definitions.push(
      {
        value: "Em observação",
        label: "Em observação",
        count: projects.filter(project => isProjectUnderObservation(project, concluido)).length,
        matches: project => isProjectUnderObservation(project, concluido),
      },
      {
        value: "Sem movimentação",
        label: `Sem movimentação (${INACTIVITY_WARNING_DAYS}+ dias)`,
        count: projects.filter(isProjectInactive).length,
        matches: isProjectInactive,
      },
      {
        value: "Atrasados",
        label: "Atrasados",
        count: projects.filter(project => isProjectOverdue(project, concluido)).length,
        matches: project => isProjectOverdue(project, concluido),
      }
    );

    return definitions;
  }, [projects, concluido]);

  const opcoesFiltro = useMemo(
    () =>
      filtrosDinamicos.filter(
        item => item.count > 0 || item.value === filtro
      ),
    [filtrosDinamicos, filtro]
  );

  const projetos = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase("pt-BR");

    let lista = projects.filter(project => {
      if (!termo) return true;

      return (
        project.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        project.versao.toLocaleLowerCase("pt-BR").includes(termo)
      );
    });

    if (filtro !== "Todos") {
      const definition = filtrosDinamicos.find(item => item.value === filtro);
      if (definition) lista = lista.filter(definition.matches);
    }

    const ordenada = [...lista];

    switch (ordenacao) {
      case "Prazo":
        ordenada.sort((a, b) => deadlineTimestamp(a.prazo) - deadlineTimestamp(b.prazo));
        break;

      case "Tarefas":
        ordenada.sort((a, b) => totalTasks(b) - totalTasks(a));
        break;

      case "Movimentação":
        ordenada.sort((a, b) => {
          const dataA = parseProjectTimestamp(a.ultimaMovimentacao)?.getTime() ?? 0;
          const dataB = parseProjectTimestamp(b.ultimaMovimentacao)?.getTime() ?? 0;
          return dataA - dataB;
        });
        break;

      default:
        ordenada.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }

    return ordenada;
  }, [projects, pesquisa, filtro, ordenacao, filtrosDinamicos]);

  const colunaEsquerda = projetos.filter((_, index) => index % 2 === 0);
  const colunaDireita = projetos.filter((_, index) => index % 2 !== 0);

  const semDadosMovimentacao = projects.filter(
    project => daysWithoutMovement(project.ultimaMovimentacao) === null
  ).length;

  function localizarProjeto(project: Project) {
    setFiltro("Todos");
    setPesquisa(project.nome);
  }

  function alternarPainel(painel: keyof typeof paineis) {
    setPaineis(atual => ({ ...atual, [painel]: !atual[painel] }));
  }

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>IWS ReleaseHub</h1>
            <span>{projects.length} Projetos</span>
          </div>

          <div className="dashboard-release-control">
            <div className="dashboard-release-selector">
              <label>Release em acompanhamento</label>

              <select
                value={ambienteSelecionadoId ?? ""}
                disabled={
                  carregandoAmbientes || ambientes.length === 0 || sincronizandoRedmine
                }
                onChange={event => alterarAmbiente(Number(event.target.value))}
              >
                {ambientes.length === 0 && (
                  <option value="">Nenhuma release cadastrada</option>
                )}

                {ambientes.map(ambiente => (
                  <option key={ambiente.id} value={ambiente.id}>
                    {ambiente.nome}
                  </option>
                ))}
              </select>

              {ambienteSelecionado && (
                <small>
                  Intellicash {ambienteSelecionado.versoes.intellicash}
                  {concluido ? " • Release concluída" : ""}
                </small>
              )}
            </div>

            {podeEditar && (
              <button
                type="button"
                className="dashboard-redmine-sync"
                disabled={
                  ambienteSelecionadoId === null ||
                  sincronizandoRedmine ||
                  carregando ||
                  carregandoAmbientes
                }
                onClick={sincronizarRedmine}
              >
                {sincronizandoRedmine
                  ? "Sincronizando Redmine..."
                  : "Sincronizar com o Redmine"}
              </button>
            )}

            {mensagemRedmine && (
              <span
                className={`dashboard-redmine-message ${mensagemRedmine.tipo}`}
                title={mensagemRedmine.detalhes}
              >
                {mensagemRedmine.texto}
              </span>
            )}
          </div>
        </div>

        <Suspense
          fallback={
            <div className="dashboard-empty">
              <h2>Carregando monitoramento do Redmine...</h2>
            </div>
          }
        >
          <RedmineProjectsMonitor />
        </Suspense>

        <DashboardStats
          projects={projects}
          concluido={concluido}
          filtroAtivo={filtro}
          onFilter={setFiltro}
        />

        {semDadosMovimentacao > 0 && !carregando && (
          <div className="dashboard-activity-hint">
            {semDadosMovimentacao === projects.length
              ? "A informação de movimentação aparecerá após a próxima sincronização com o Redmine."
              : `${semDadosMovimentacao} projeto${semDadosMovimentacao === 1 ? " ainda não possui" : "s ainda não possuem"} histórico de movimentação sincronizado.`}
          </div>
        )}

        <CollapsibleSection
          title="Compatibilidade"
          subtitle="Versões relacionadas à release"
          open={paineis.compatibilidade}
          onToggle={() => alternarPainel("compatibilidade")}
        >
          <CompatibilityPanel
            projects={projects}
            carregando={carregando || carregandoAmbientes}
          />
        </CollapsibleSection>

        <Suspense
          fallback={
            <div className="dashboard-empty">
              <h2>Carregando indicadores...</h2>
            </div>
          }
        >
          <CollapsibleSection
            title="Análises"
            subtitle="Distribuição e projetos com maior volume de tarefas"
            open={paineis.analises}
            onToggle={() => alternarPainel("analises")}
          >
            <div className="dashboard-charts">
              <TasksChart projects={projects} />
              <TopProjects projects={projects} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Observação"
            subtitle="Projetos que merecem acompanhamento mais próximo"
            open={paineis.observacao}
            onToggle={() => alternarPainel("observacao")}
          >
            <AttentionProjects
              projects={projects}
              concluido={concluido}
              onProjectClick={localizarProjeto}
            />
          </CollapsibleSection>
        </Suspense>

        <div className="dashboard-filters">
          <input
            className="dashboard-search"
            placeholder="Pesquisar projeto ou versão..."
            value={pesquisa}
            onChange={event => setPesquisa(event.target.value)}
          />

          <label className="dashboard-select-field">
            <span>Situação</span>
            <select
              className="dashboard-filter"
              value={filtro}
              onChange={event => setFiltro(event.target.value)}
            >
              <option value="Todos">Todos ({projects.length})</option>

              {opcoesFiltro.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.count})
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-select-field">
            <span>Ordenar por</span>
            <select
              className="dashboard-filter"
              value={ordenacao}
              onChange={event => setOrdenacao(event.target.value)}
            >
              <option>Nome</option>
              <option>Prazo</option>
              <option>Tarefas</option>
              <option>Movimentação</option>
            </select>
          </label>

          {(filtro !== "Todos" || pesquisa) && (
            <button
              type="button"
              className="dashboard-clear-filters"
              onClick={() => {
                setFiltro("Todos");
                setPesquisa("");
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        <span className="dashboard-counter">
          Exibindo {projetos.length} de {projects.length} projetos
          {ambienteSelecionado && <> • {ambienteSelecionado.nome}</>}
          {filtro !== "Todos" && <> • Filtro: {filtro}</>}
          {!podeEditar && " • Somente leitura"}
        </span>

        {carregando ? (
          <div className="dashboard-empty">
            <h2>Carregando projetos...</h2>
          </div>
        ) : projects.length === 0 ? (
          <div className="dashboard-empty">
            <h2>Nenhum projeto cadastrado</h2>
            <p>Esta release ainda não possui projetos vinculados.</p>
          </div>
        ) : projetos.length === 0 ? (
          <div className="dashboard-empty">
            <h2>Nenhum resultado encontrado</h2>
            <p>Existem projetos nesta release, mas nenhum corresponde aos filtros selecionados.</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            <div className="dashboard-column">
              {colunaEsquerda.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  canEdit={podeEditar}
                  concluido={concluido}
                  onOpen={setProjectSelecionado}
                  onFilterStatus={setFiltro}
                />
              ))}
            </div>

            <div className="dashboard-column">
              {colunaDireita.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  canEdit={podeEditar}
                  concluido={concluido}
                  onOpen={setProjectSelecionado}
                  onFilterStatus={setFiltro}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {podeEditar && projectSelecionado && ambienteSelecionado && (
        <Suspense fallback={null}>
          <ProjectDrawer
            project={projectSelecionado}
            environment={ambienteSelecionado}
            onSave={salvarProjeto}
            onClose={() => setProjectSelecionado(null)}
          />
        </Suspense>
      )}
    </Layout>
  );
}

export default Dashboard;
