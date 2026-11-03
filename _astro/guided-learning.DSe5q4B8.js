var e=[{id:`tool-validation`,title:`校验工具参数并返回字段错误`,topic:`工具输入校验`,stage:`minimal-agent`,language:`python`,functionName:`validate_booking`,prompt:`实现 validate_booking(args)。输入一定是字典，只允许 date、people 两个字段。date 必须是非空字符串（去掉首尾空白后判断，不要求解析日期），people 必须是 1–8 的整数，布尔值不能算整数。返回错误码列表，顺序固定：unknown_fields、invalid_date、invalid_people；没有错误返回 []。这里只校验输入结构，不代表业务授权或座位可用。`,starter:`def validate_booking(args):
    # 按约定顺序收集字段错误
    return []
`,example:`{"date":" ","people":True,"admin":True} → 三个错误码，按题目顺序返回。`,hint:`先用集合差找额外字段；用 isinstance 判断类型，并额外排除 bool；Python 的 bool 是 int 的子类。`,solution:`def validate_booking(args):
    errors = []
    if set(args) - {"date", "people"}:
        errors.append("unknown_fields")
    date = args.get("date")
    if not isinstance(date, str) or not date.strip():
        errors.append("invalid_date")
    people = args.get("people")
    if not isinstance(people, int) or isinstance(people, bool) or not 1 <= people <= 8:
        errors.append("invalid_people")
    return errors
`,failure:`只用 isinstance(people, int) 会把 True 当成 1；只检查字段存在也会放过空字符串。`,transfer:`真实系统再使用明确的 Schema、日期时区、业务权限和可用性检查，不能用本题两层校验代替全部校验。`,cases:[{name:`正常输入`,args:[{date:`2026-11-01`,people:2}],expected:[]},{name:`三个字段错误`,args:[{date:` `,people:!0,admin:!0}],expected:[`unknown_fields`,`invalid_date`,`invalid_people`]},{name:`缺少字段`,args:[{}],expected:[`invalid_date`,`invalid_people`]},{name:`人数超限`,args:[{date:` tomorrow `,people:9}],expected:[`invalid_people`]},{name:`字符串人数`,args:[{date:5,people:`2`}],expected:[`invalid_date`,`invalid_people`]}]},{id:`agent-loop`,title:`手写一个有停止条件的工具循环`,topic:`Agent 执行循环`,stage:`minimal-agent`,language:`python`,functionName:`run_agent`,prompt:`实现 run_agent(events, tools, max_steps)。events 是按顺序给定的模型事件：{"type":"tool","name":"search","input":"x"} 或 {"type":"finish","answer":"..."}。tools 是工具名到预设返回值的字典，不调用真实工具。最多消费 max(0,max_steps) 个事件；tool 把 {tool:name,result:预设值} 加到 observations；未知工具立即返回 status=unknown_tool；finish 立即返回 status=finished 和 answer；没有 finish 时，若仍有未消费事件返回 limit，否则 exhausted。所有返回都含 status、answer（未完成为 null）、observations。`,starter:`def run_agent(events, tools, max_steps):
    observations = []
    # 逐步处理事件，并明确返回终止状态
    return {"status": "exhausted", "answer": None, "observations": observations}
`,example:`tool(search) → finish("找到资料")，预算2：先保存工具观察，再结束；预算1：返回 limit。`,hint:`每个事件先检查类型；finish 必须立刻 return，工具调用成功也不能直接冒充最终完成。`,solution:`def run_agent(events, tools, max_steps):
    observations = []
    count = min(len(events), max(0, max_steps))
    for event in events[:count]:
        if event["type"] == "finish":
            return {"status": "finished", "answer": event["answer"], "observations": observations}
        name = event["name"]
        if name not in tools:
            return {"status": "unknown_tool", "answer": None, "observations": observations}
        observations.append({"tool": name, "result": tools[name]})
    status = "limit" if count < len(events) else "exhausted"
    return {"status": status, "answer": None, "observations": observations}
`,failure:`拿到一个工具结果就宣告完成，会跳过后续观察和 finish；没有步数预算则可能永远执行。`,transfer:`在线实现应把观察放回模型上下文，校验工具参数、权限与调用 ID，处理超时和副作用；本题事件流只用来练控制流。`,cases:[{name:`工具后结束`,args:[[{type:`tool`,name:`search`,input:`x`},{type:`finish`,answer:`找到资料`}],{search:`doc-a`},2],expected:{status:`finished`,answer:`找到资料`,observations:[{tool:`search`,result:`doc-a`}]}},{name:`达到预算`,args:[[{type:`tool`,name:`search`},{type:`finish`,answer:`x`}],{search:0},1],expected:{status:`limit`,answer:null,observations:[{tool:`search`,result:0}]}},{name:`未知工具`,args:[[{type:`tool`,name:`delete`}],{},5],expected:{status:`unknown_tool`,answer:null,observations:[]}},{name:`空事件`,args:[[],{},3],expected:{status:`exhausted`,answer:null,observations:[]}},{name:`负预算`,args:[[{type:`finish`,answer:`x`}],{},-1],expected:{status:`limit`,answer:null,observations:[]}},{name:`结束后不再执行`,args:[[{type:`finish`,answer:``},{type:`tool`,name:`delete`}],{},3],expected:{status:`finished`,answer:``,observations:[]}}]},{id:`chunk-overlap`,title:`按窗口切分资料并保留重叠`,topic:`RAG 文档切分`,stage:`retrieval`,language:`python`,functionName:`chunk_tokens`,prompt:`实现 chunk_tokens(tokens, size, overlap)。tokens 是已经切好的单位列表；本题不实现 tokenizer。size>0 且 0≤overlap<size 时，按步长 size-overlap 切窗；到达末尾后停止，不再生成全被上一窗口覆盖的尾块。每块返回 {start,end,tokens}，end 为开区间；参数不满足条件时返回 []。`,starter:`def chunk_tokens(tokens, size, overlap):
    return []
`,example:`[a,b,c,d,e], size=3, overlap=1 → [0,3) 与 [2,5)，不再生成 [4,5)。`,hint:`每次先算 end=min(start+size,n)，若 end==n 则结束；否则 start += size-overlap。`,solution:`def chunk_tokens(tokens, size, overlap):
    if size <= 0 or overlap < 0 or overlap >= size:
        return []
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + size, len(tokens))
        chunks.append({"start": start, "end": end, "tokens": tokens[start:end]})
        if end == len(tokens):
            break
        start += size - overlap
    return chunks
`,failure:`overlap=size 会使步长为零；只按 range 步长遍历而不检查末尾，可能生成冗余尾块。`,transfer:`工程中还要保留文档 ID、章节和偏移，并比较检索质量；重叠更多会增加索引与上下文成本。`,cases:[{name:`正常重叠`,args:[[`a`,`b`,`c`,`d`,`e`],3,1],expected:[{start:0,end:3,tokens:[`a`,`b`,`c`]},{start:2,end:5,tokens:[`c`,`d`,`e`]}]},{name:`短文档`,args:[[`a`],4,1],expected:[{start:0,end:1,tokens:[`a`]}]},{name:`非法步长`,args:[[`a`],2,2],expected:[]},{name:`空文档`,args:[[],3,0],expected:[]},{name:`不足整窗的末块`,args:[[1,2,3,4,5,6],4,1],expected:[{start:0,end:4,tokens:[1,2,3,4]},{start:3,end:6,tokens:[4,5,6]}]}]},{id:`rank-fusion`,title:`融合两路检索的排名`,topic:`RRF 检索融合`,stage:`retrieval`,language:`python`,functionName:`fuse_ranks`,prompt:`实现 fuse_ranks(rankings, k, limit)。rankings 为若干文档 ID 排名列表，每路相同 ID 只取第一次出现的位置（从1开始，位置仍按原列表计算）。每个 ID 得分累加 1/(k+rank)，k 是正整数。按总分降序返回前 limit 个 ID；同分按 ID 字符串升序。limit≤0 返回 []。输入 ID 均为字符串。`,starter:`def fuse_ranks(rankings, k, limit):
    return []
`,example:`[[a,b],[b,c]], k=1：b 同时从两路得分，因此排在 a 前面。`,hint:`每路维护 seen 防重复计分；全局用 scores 累加；排序键为 (-score, id)。`,solution:`def fuse_ranks(rankings, k, limit):
    if limit <= 0:
        return []
    scores = {}
    for ranking in rankings:
        seen = set()
        for rank, doc in enumerate(ranking, 1):
            if doc in seen:
                continue
            seen.add(doc)
            scores[doc] = scores.get(doc, 0) + 1 / (k + rank)
    ranked = sorted(scores, key=lambda doc: (-scores[doc], doc))
    return ranked[:limit]
`,failure:`跨路去重后才计分会丢失独立检索信号；同一路重复累计会让重复 ID 获得不合理优势。`,transfer:`RRF 融合排名而非原始分数；仍需统一文档身份、权限过滤和评测，不把融合得分解释为事实正确概率。`,cases:[{name:`跨路累加`,args:[[[`a`,`b`],[`b`,`c`]],1,3],expected:[`b`,`a`,`c`]},{name:`同分稳定`,args:[[[`b`],[`a`]],2,4],expected:[`a`,`b`]},{name:`每路只计一次`,args:[[[`a`,`a`,`b`],[`b`]],1,2],expected:[`b`,`a`]},{name:`零输出`,args:[[[`a`]],3,0],expected:[]},{name:`空列表`,args:[[],1,2],expected:[]}]},{id:`tool-routing`,title:`按白名单分发只读工具请求`,topic:`工具分发与权限`,stage:`minimal-agent`,language:`python`,functionName:`dispatch_tools`,prompt:`实现 dispatch_tools(calls, allowed, results)。calls 的元素含 id 和 name；allowed 是当前允许的工具名列表；results 为调用 ID 到预设结果的字典。逐个返回 {id,status,result}：先检查权限，不允许则 denied；允许但 ID 不在 results 则 missing；存在则 ok，保留包括0、false、null在内的原结果。denied/missing 的 result 为 null。只模拟分发，不执行网络或文件动作。`,starter:`def dispatch_tools(calls, allowed, results):
    return []
`,example:`允许 search，结果 {x:0}：x/search 返回 ok 与0；同 ID 的 delete 仍返回 denied。`,hint:`权限判断优先；查结果存在性用 id in results，不能用结果的真假。`,solution:`def dispatch_tools(calls, allowed, results):
    allowed_names = set(allowed)
    output = []
    for call in calls:
        call_id = call["id"]
        if call["name"] not in allowed_names:
            status, result = "denied", None
        elif call_id not in results:
            status, result = "missing", None
        else:
            status, result = "ok", results[call_id]
        output.append({"id": call_id, "status": status, "result": result})
    return output
`,failure:`先取结果再检查权限会模糊权限边界；if results.get(id) 会把合法的0或false当成未返回。`,transfer:`真实工具还需将请求 ID 与工具名、参数和用户范围绑定，避免串结果；模型提出调用不等于执行层已经授权。`,cases:[{name:`权限优先与零值`,args:[[{id:`x`,name:`search`},{id:`x`,name:`delete`},{id:`y`,name:`search`}],[`search`],{x:0}],expected:[{id:`x`,status:`ok`,result:0},{id:`x`,status:`denied`,result:null},{id:`y`,status:`missing`,result:null}]},{name:`保留空值`,args:[[{id:`a`,name:`read`},{id:`b`,name:`read`}],[`read`],{a:!1,b:null}],expected:[{id:`a`,status:`ok`,result:!1},{id:`b`,status:`ok`,result:null}]},{name:`空调用`,args:[[],[],{}],expected:[]},{name:`默认拒绝`,args:[[{id:`a`,name:`read`}],[],{a:`secret`}],expected:[{id:`a`,status:`denied`,result:null}]}]},{id:`stream-deltas`,title:`按调用 ID 拼接流式参数片段`,topic:`流式工具调用`,stage:`frameworks`,language:`python`,functionName:`assemble_calls`,prompt:`实现 assemble_calls(chunks)。每个片段含 id，可选 name 和 arguments（字符串增量）；同 ID 的非空 name 取第一次出现的值，arguments 按到达顺序拼接（缺失视为空串）。按调用 ID 首次出现顺序返回 {id,name,arguments} 列表；一直没有名字时为 ""。本题输入已经解码，不解析 SSE/JSON，也不执行这些参数。`,starter:`def assemble_calls(chunks):
    return []
`,example:`a 参数“{”、b 参数“x”、a 参数“}” → a为“{}”，b为“x”，不能拼成一个请求。`,hint:`用字典按 id 存状态，再用独立列表保留首次顺序；名字和参数的更新规则不同。`,solution:`def assemble_calls(chunks):
    calls = {}
    order = []
    for chunk in chunks:
        call_id = chunk["id"]
        if call_id not in calls:
            calls[call_id] = {"id": call_id, "name": "", "arguments": ""}
            order.append(call_id)
        call = calls[call_id]
        if not call["name"] and chunk.get("name", ""):
            call["name"] = chunk["name"]
        call["arguments"] += chunk.get("arguments", "")
    return [calls[call_id] for call_id in order]
`,failure:`把全部 arguments 拼到一个字符串会混合不同调用；每块直接 JSON 解析会把尚未收齐的合法流误判为错误。`,transfer:`完整收齐后仍需解析和校验 Schema、权限与重复执行；生产流还要处理 UTF-8/SSE 边界、中断、最大长度和最终结束信号。`,cases:[{name:`交错调用`,args:[[{id:`a`,name:`search`,arguments:`{`},{id:`b`,name:`read`,arguments:`x`},{id:`a`,arguments:`}`}]],expected:[{id:`a`,name:`search`,arguments:`{}`},{id:`b`,name:`read`,arguments:`x`}]},{name:`名字稍后到达`,args:[[{id:`x`,arguments:`1`},{id:`x`,name:`sum`},{id:`x`,name:`other`,arguments:`2`}]],expected:[{id:`x`,name:`sum`,arguments:`12`}]},{name:`只有ID`,args:[[{id:`x`}]],expected:[{id:`x`,name:``,arguments:``}]},{name:`空流`,args:[[]],expected:[]}]},{id:`dependency-levels`,title:`把任务图分成可并行执行的层`,topic:`任务 DAG`,stage:`frameworks`,language:`python`,functionName:`dependency_levels`,prompt:`实现 dependency_levels(nodes, edges)。nodes 为不重复字符串列表；edges 的 [a,b] 表示 a 必须先于 b，端点都在 nodes，重复边只算一次。返回按层排列的节点列表，每层按 nodes 原始顺序；一层全部完成后才进入下一层。若有环返回 []，不返回部分层。空图也返回 []。`,starter:`def dependency_levels(nodes, edges):
    return []
`,example:`nodes=[a,b,c,d], edges=[[a,c],[b,c],[c,d]] → [[a,b],[c],[d]]。`,hint:`维护入度和出边；一轮先固定当前零入度节点，再更新下一层，最后核对处理数量。`,solution:`def dependency_levels(nodes, edges):
    indegree = {node: 0 for node in nodes}
    graph = {node: [] for node in nodes}
    seen = set()
    for a, b in edges:
        edge = (a, b)
        if edge not in seen:
            seen.add(edge)
            graph[a].append(b)
            indegree[b] += 1
    remaining = list(nodes)
    levels = []
    while remaining:
        level = [node for node in remaining if indegree[node] == 0]
        if not level:
            return []
        levels.append(level)
        active = set(level)
        remaining = [node for node in remaining if node not in active]
        for node in level:
            for following in graph[node]:
                indegree[following] -= 1
    return levels
`,failure:`边处理边把新零入度节点加入当前层，会违反“本层全部完成后再执行下一层”；忽略重复边会导致入度错误。`,transfer:`分层只给出依赖上允许的并行度；实际执行仍需并发上限、资源限制、失败传播与取消策略。`,cases:[{name:`汇合依赖`,args:[[`a`,`b`,`c`,`d`],[[`a`,`c`],[`b`,`c`],[`c`,`d`]]],expected:[[`a`,`b`],[`c`],[`d`]]},{name:`重复边`,args:[[`a`,`b`],[[`a`,`b`],[`a`,`b`]]],expected:[[`a`],[`b`]]},{name:`有环不保留半结果`,args:[[`x`,`a`,`b`],[[`a`,`b`],[`b`,`a`]]],expected:[]},{name:`无边保留顺序`,args:[[`z`,`a`],[]],expected:[[`z`,`a`]]},{name:`空图`,args:[[],[]],expected:[]}]},{id:`eval-aggregate`,title:`按场景汇总任务成功率`,topic:`Agent 评测数据`,stage:`engineering`,language:`python`,functionName:`summarize_evals`,prompt:`实现 summarize_evals(runs)。每条记录有 scenario、success（布尔值）、latency（非负数）。按 scenario 字符串升序返回 {scenario,total,successes,success_rate,mean_latency}；成功率与平均延迟四舍五入到4位小数。失败运行也计入总数和耗时，不能删掉再汇报。空输入返回 []。`,starter:`def summarize_evals(runs):
    return []
`,example:`同场景成功1次耗时10、失败1次耗时30 → success_rate=0.5，mean_latency=20。`,hint:`每个场景累计 total、successes、latency_sum，最后统一计算；别把两种不同的分母混用。`,solution:`def summarize_evals(runs):
    groups = {}
    for run in runs:
        key = run["scenario"]
        if key not in groups:
            groups[key] = {"total": 0, "successes": 0, "latency_sum": 0}
        group = groups[key]
        group["total"] += 1
        group["successes"] += 1 if run["success"] else 0
        group["latency_sum"] += run["latency"]
    output = []
    for key in sorted(groups):
        group = groups[key]
        total = group["total"]
        output.append({"scenario": key, "total": total, "successes": group["successes"], "success_rate": round(group["successes"] / total, 4), "mean_latency": round(group["latency_sum"] / total, 4)})
    return output
`,failure:`只统计成功运行，会高估成功率并低估失败带来的耗时；先四舍五入每次数据再求均值也会引入额外误差。`,transfer:`真实评测还应记录模型、提示与数据版本、样本数和置信程度；不同场景均值与全量加权均值不可混称。`,cases:[{name:`包括失败耗时`,args:[[{scenario:`rag`,success:!0,latency:10},{scenario:`rag`,success:!1,latency:30}]],expected:[{scenario:`rag`,total:2,successes:1,success_rate:.5,mean_latency:20}]},{name:`分场景排序`,args:[[{scenario:`z`,success:!1,latency:0},{scenario:`a`,success:!0,latency:2}]],expected:[{scenario:`a`,total:1,successes:1,success_rate:1,mean_latency:2},{scenario:`z`,total:1,successes:0,success_rate:0,mean_latency:0}]},{name:`保留四位`,args:[[{scenario:`x`,success:!0,latency:1},{scenario:`x`,success:!1,latency:1},{scenario:`x`,success:!1,latency:2}]],expected:[{scenario:`x`,total:3,successes:1,success_rate:.3333,mean_latency:1.3333}]},{name:`空数据`,args:[[]],expected:[]}]}],t=[{id:`prepare`,title:`编程与接口准备`,goal:`先读懂输入和返回，再准备独立环境与配置。`,prerequisites:[],basics:[`函数、列表与字典`,`JSON 与 HTTP`,`解释器、依赖与配置`],lessonIds:[`tencent-011-004-2fb8fcaafa`,`tencent-011-004-cc43dc69ae`,`tencent-011-004-cc43dc69ae-e4e549`],practiceIds:[`normalize`,`payload`,`retry`],acceptance:[`能顺着短函数算出结果`,`能找到正在使用的解释器`,`能区分配置缺失与类型错误`],deeper:`第一次学编程，先完成上方编程短课；工具原型可在 Agent 阶段再看。`},{id:`model`,title:`大模型基础与调用`,goal:`看懂一条模型请求，分清 Token、消息与采样。`,prerequisites:[`prepare`],basics:[`模型的能力边界`,`Token 与窗口`,`请求、返回与采样参数`],lessonIds:[`tencent-005-007-4b9cf4a83b`,`tencent-005-010`,`tencent-005-007-cc43dc69ae`,`feishu-23b2e522fc`],practiceIds:[`payload`],acceptance:[`能画出消息与响应`,`能说明 Token 与字数的区别`,`能指出请求失败和回答错误的区别`],deeper:`多模态与流式可以稍后选学，先做出第一个文字助手。`},{id:`prompt`,title:`提示词与可靠输出`,goal:`写清任务条件，让输出可以检查。`,prerequisites:[`model`],basics:[`要求与资料分开`,`示例和格式约定`,`语法、业务与事实分别检查`],lessonIds:[`tencent-005-009-8a069c777d`,`tencent-005-009-3ef6f80a3f`,`tencent-005-009-3cc0d84978`,`feishu-4f9270a46f`],practiceIds:[`tool-validation`],acceptance:[`能把含糊要求改成可核对条件`,`能指出格式正确但事实错误的回答`,`能在缺少依据时保留不确定性`],deeper:`先比较正常与缺字段例子，再学提示链和自动改写。`},{id:`minimal-agent`,title:`工具调用与最小 Agent`,goal:`让工具结果影响下一步，并让循环能够停止。`,prerequisites:[`prompt`],basics:[`工具请求不等于已执行`,`参数校验与结果回传`,`观察、退出与有限重试`],lessonIds:[`tencent-005-001`,`tencent-011-002-d29c4d5e4c`,`tencent-011-002-a9c74da64b`,`tencent-005-005-b314bf0a0e`,`tencent-011-002-9cb0db7500`],practiceIds:[`agent-loop`,`tool-validation`,`idempotency`],acceptance:[`能说明模型请求与执行层的责任`,`能画出工具执行和回传`,`能处理缺参数、超时与预算耗尽`],deeper:`规划、反思和多 Agent 在单个工具闭环跑通后选学。`},{id:`memory`,title:`上下文与记忆`,goal:`挑选当前需要的信息，保留可更新的长期事实。`,prerequisites:[`minimal-agent`],basics:[`当前输入与外部存储`,`消息顺序和完整预算`,`摘要的遗漏与用户隔离`],lessonIds:[`tencent-011-003-54b86f5a5b`,`tencent-005-014`,`tencent-011-003-f8135f794e`,`tencent-011-003-444349d914`],practiceIds:[`window`,`dedup`],acceptance:[`能说明什么信息进入当前请求`,`能解释摘要丢失日期的后果`,`能更新冲突记忆而不串用户`],deeper:`向量记忆、并发更新和架构案例按需要深入。`},{id:`retrieval`,title:`基础 RAG：找到依据再回答`,goal:`逐步完成检索与回答，分别检查哪里出了错。`,prerequisites:[`memory`],basics:[`嵌入和分块`,`召回与证据`,`引用、拒答与基础诊断`],lessonIds:[`feishu-8f059f0e81`,`feishu-b92e147637`,`tencent-010-eb81779983`,`tencent-010-f863748d94`,`tencent-010-8fd3bcfcc0`,`tencent-011-007`],practiceIds:[`chunk-overlap`,`top-k`,`evidence`,`metrics`],acceptance:[`能从问题追到具体证据`,`能区分漏检和混入无关结果`,`能说明资料不足时为什么不能硬答`],deeper:`先完成一种资料问答，再比较混合检索、重排和 GraphRAG。`},{id:`frameworks`,title:`LangGraph：状态与可恢复流程`,goal:`从不调用模型的小图开始，逐步增加分支、循环与恢复。`,prerequisites:[`minimal-agent`,`memory`],basics:[`State、Node 与 Edge`,`Reducer 和停止条件`,`检查点、线程与人工中断`],lessonIds:[`tencent-012-004-90f310310f`,`tencent-007-004-002-6320b4a872`,`tencent-007-004-002-2410d860f0`,`tencent-007-004-002-099db31379`,`tencent-013-011-b3f37fad8f`,`tencent-012-004-c6de23d6f8`,`tencent-007-004-003-b9429ce0f8`,`tencent-007-003-001-199a0dbda6`,`tencent-007-003-004-f9d19345a0`],practiceIds:[`graph`,`idempotency`,`dependency-levels`],acceptance:[`能逐步解释状态更新`,`能指出循环出口与合并规则`,`能分清恢复内部状态与重复外部写入`],deeper:`LangChain 可单独选学；子图、并行、Functional API 和底层机制放到后面。`},{id:`engineering`,title:`评测与可靠性`,goal:`在相同样本上比较质量，并记录失败、延迟与成本。`,prerequisites:[`retrieval`,`frameworks`],basics:[`明确指标的分子与分母`,`分开检索、答案与工具`,`有界重试和可追踪日志`],lessonIds:[`feishu-98756d03da`,`tencent-010-21e6ebbe0d`,`tencent-010-5d17a6c114`,`feishu-f3f66b964e`,`tencent-006-008-002`],practiceIds:[`metrics`,`p95`,`eval-aggregate`,`sql-errors`],acceptance:[`能复算一次精确率与召回率`,`能从日志定位失败步骤`,`能用同一批失败样例验证修复`],deeper:`20 项 Agent 指标的定义和算例可到百科查，部署与安全按项目逐步补齐。`},{id:`project`,title:`综合复习：检查输入、状态与结果`,goal:`用几道短函数练习串起检索、工具、状态恢复与评估。`,prerequisites:[`engineering`],basics:[`先定一种真实用途`,`正常与失败流程都要验证`,`保留可重复的输入与结果`],lessonIds:[],practiceHref:`/coding/#exercise-eval-aggregate`,practiceIds:[`tool-routing`,`rank-fusion`,`eval-aggregate`],acceptance:[`能找到资料并给出证据`,`能核对工具与恢复状态`,`能比较一次改进前后的结果`],deeper:`手写代码按题逐步复习；业务案例、训练算法和面试表达继续选学。`}],n=[{id:`p-json`,stage:`prepare`,prompt:`接口要接收一个 JSON 对象，下面哪种写法是合法 JSON？`,options:[`{"role":"user","content":"你好"}`,`{'role':'user'}`,`{role:user}`],correct:0,explanation:`JSON 的属性名和字符串使用双引号，不能直接套用 Python 字典文本。`},{id:`p-status`,stage:`prepare`,prompt:`预约请求超时，最先应判断什么？`,options:[`立刻无限重试`,`服务端是否已经执行成功`,`把超时视作必定失败`],correct:1,explanation:`超时表示没有及时收到响应，不表示服务端没有产生副作用。`},{id:`p-output`,stage:`model`,prompt:`模型返回合法 JSON，能够说明什么？`,options:[`内容一定符合事实`,`工具权限校验可以省略`,`结构可解析，事实仍需验证`],correct:2,explanation:`格式、业务规则与事实正确性是不同层面的检查。`},{id:`p-agent`,stage:`minimal-agent`,prompt:`最小 Agent 循环应该包含什么？`,options:[`只调用一次模型就无限运行`,`读取状态、选择动作、观察结果与终止条件`,`隐藏失败并重复上一动作`],correct:1,explanation:`下一步应受到观察结果影响，循环还必须具有停止和失败处理。`},{id:`p-rag`,stage:`retrieval`,prompt:`检索返回高相似度片段，能否直接作为真实答案？`,options:[`高分就一定正确`,`Top-k 越大一定越好`,`还要核对来源、版本和是否支持结论`],correct:2,explanation:`相关性、真实性和证据充分性不是同一个指标。`},{id:`p-state`,stage:`frameworks`,prompt:`检查点能否单独保证外部预约恰好执行一次？`,options:[`不能，还要处理幂等与事务边界`,`能，任何节点都安全重放`,`只要保留聊天历史即可`],correct:0,explanation:`外部写入成功而状态保存失败时，恢复可能重复执行。`}],r=[{id:`normalize`,title:`把输入整理成稳定的名字`,topic:`Python 函数`,stage:`prepare`,language:`python`,functionName:`normalize_name`,prompt:`实现 normalize_name(value)：移除首尾空白，并将英文字母转小写；输入保证是字符串。不要修改中间空格。`,starter:`def normalize_name(value):
    # 完成下面的返回值
    return value
`,example:`输入 "  Alice  "，预期 "alice"。`,hint:`字符串的 strip() 和 lower() 都会返回新字符串。`,solution:`def normalize_name(value):
    return value.strip().lower()
`,failure:`只调用 lower() 会保留首尾空白；split() 再拼接可能误改中间空格。`,transfer:`工具参数校验前可做明确的规范化，但不能擅自改变有意义的用户输入。`,cases:[{name:`首尾空白`,args:[`  Alice  `],expected:`alice`},{name:`中间空格保留`,args:[`  A B `],expected:`a b`},{name:`空字符串`,args:[``],expected:``},{name:`中文`,args:[`  小明 `],expected:`小明`}]},{id:`payload`,title:`构造模型消息请求`,topic:`JSON 与字典`,stage:`model`,language:`python`,functionName:`build_payload`,prompt:`实现 build_payload(model, text)，返回包含 model 和 messages 的字典。messages 是一条 role=user、content=text 的消息。返回字典，不要手工拼 JSON 字符串。`,starter:`def build_payload(model, text):
    return {"model": model, "messages": []}
`,example:`模型 m、文本 你好 → {"model":"m","messages":[{"role":"user","content":"你好"}]}。`,hint:`messages 是列表，列表中的每条消息是字典。`,solution:`def build_payload(model, text):
    return {"model": model, "messages": [{"role": "user", "content": text}]}
`,failure:`messages 写成对象、丢失 role 或把用户文本拼入模板，都可能破坏接口约定。`,transfer:`请求结构正确之后，仍要分别处理业务校验和模型输出校验。`,cases:[{name:`中文消息`,args:[`m`,`你好`],expected:{model:`m`,messages:[{role:`user`,content:`你好`}]}},{name:`引号和换行`,args:[`demo`,`"hi"
next`],expected:{model:`demo`,messages:[{role:`user`,content:`"hi"
next`}]}},{name:`空消息结构仍保持`,args:[`x`,``],expected:{model:`x`,messages:[{role:`user`,content:``}]}}]},{id:`retry`,title:`有限重试的判断`,topic:`HTTP 与边界`,stage:`minimal-agent`,language:`python`,functionName:`should_retry`,prompt:`实现 should_retry(status, attempt, max_attempts)。仅 429、500、502、503、504 可重试，且 attempt < max_attempts。attempt 表示已经执行的次数，至少为 1；本题只返回布尔值，不执行请求。`,starter:`def should_retry(status, attempt, max_attempts):
    return False
`,example:`503, 1, 3 → True；400, 1, 3 → False；503, 3, 3 → False。`,hint:`把“状态是否允许”与“次数是否还有余量”两个条件用 and 连接。`,solution:`def should_retry(status, attempt, max_attempts):
    return status in [429, 500, 502, 503, 504] and attempt < max_attempts
`,failure:`不能把所有 4xx 都重试；有副作用的写操作还需要幂等保护，本题的 True 不是直接重放许可。`,transfer:`给重试策略增加退避、日志及幂等检查，再用故障测试验证。`,cases:[{name:`临时不可用`,args:[503,1,3],expected:!0},{name:`次数耗尽`,args:[503,3,3],expected:!1},{name:`参数错误`,args:[400,1,3],expected:!1},{name:`限流`,args:[429,2,3],expected:!0},{name:`成功`,args:[200,1,3],expected:!1}]},{id:`dedup`,title:`保留首次出现的请求`,topic:`哈希去重`,stage:`minimal-agent`,language:`python`,functionName:`unique_requests`,prompt:`实现 unique_requests(requests)：输入是含 id 的请求字典列表，按 id 去重，保留第一次出现的完整字典和原顺序。`,starter:`def unique_requests(requests):
    result = []
    # 用集合记录已经见过的 id
    return result
`,example:`[{id:a,value:1},{id:a,value:2},{id:b,value:3}] → 首个 a 和 b。`,hint:`先判断是否见过，没见过才加入结果并记录 id。`,solution:`def unique_requests(requests):
    seen = set()
    result = []
    for request in requests:
        if request["id"] not in seen:
            seen.add(request["id"])
            result.append(request)
    return result
`,failure:`用字典最后覆盖会保留最后一条，且与“第一次请求生效”的约定不同。`,transfer:`实际幂等还要验证同一键的请求内容是否一致，并保存执行结果。`,cases:[{name:`稳定去重`,args:[[{id:`a`,value:1},{id:`a`,value:2},{id:`b`,value:3}]],expected:[{id:`a`,value:1},{id:`b`,value:3}]},{name:`空列表`,args:[[]],expected:[]},{name:`数字 ID`,args:[[{id:0},{id:0},{id:1}]],expected:[{id:0},{id:1}]}]},{id:`idempotency`,title:`同一请求只执行一次`,topic:`幂等执行记录`,stage:`minimal-agent`,language:`python`,functionName:`execute_once`,prompt:`输入 requests 是 [request_id, value] 列表。首次见到 id 时执行 value * 2 并缓存，重复 id 返回首次结果。返回 {results: 所有返回值, executions: 实际执行次数}。本题保证相同 id 的 value 一致。`,starter:`def execute_once(requests):
    cache = {}
    results = []
    executions = 0
    return {"results": results, "executions": executions}
`,example:`[["a",2],["a",2],["b",3]] → results=[4,4,6], executions=2。`,hint:`检查“是否在 cache 中”，不要用缓存值的真假代替存在判断。`,solution:`def execute_once(requests):
    cache = {}
    results = []
    executions = 0
    for request_id, value in requests:
        if request_id not in cache:
            cache[request_id] = value * 2
            executions += 1
        results.append(cache[request_id])
    return {"results": results, "executions": executions}
`,failure:`缓存值为 0 也是有效结果；if not cache.get(id) 会错误地重复执行。`,transfer:`真实系统还需并发原子性、内容哈希、结果持久化和过期策略。`,cases:[{name:`重复返回`,args:[[[`a`,2],[`a`,2],[`b`,3]]],expected:{results:[4,4,6],executions:2}},{name:`零值也缓存`,args:[[[`a`,0],[`a`,0]]],expected:{results:[0,0],executions:1}},{name:`空输入`,args:[[]],expected:{results:[],executions:0}}]},{id:`window`,title:`保留系统规则和最近消息`,topic:`上下文预算`,stage:`frameworks`,language:`python`,functionName:`trim_messages`,prompt:`messages 的第一条为 system，其余是普通对话，每条含 tokens。预算足够保留 system。始终保留 system，再从最新消息向前保留能容纳的连续尾部；遇到一条放不下就停止。输出保持原顺序。tokens 为题目给定的模拟单位。`,starter:`def trim_messages(messages, budget):
    if not messages:
        return []
    # 保留 system 后，从尾部开始计算
    return messages
`,example:`系统2、旧消息3、新消息4，预算6 → 系统与新消息。`,hint:`系统先占用预算；倒序收集尾部，最后反转。`,solution:`def trim_messages(messages, budget):
    if not messages:
        return []
    remaining = budget - messages[0]["tokens"]
    tail = []
    for message in reversed(messages[1:]):
        if message["tokens"] > remaining:
            break
        tail.append(message)
        remaining -= message["tokens"]
    return [messages[0]] + list(reversed(tail))
`,failure:`跳过放不下的最新消息再保留很旧的消息，会破坏本题“连续尾部”的约定。`,transfer:`真实工具调用对不能随意拆开，真实 Token 数还需对应 tokenizer。`,cases:[{name:`裁剪旧消息`,args:[[{role:`system`,tokens:2},{role:`user`,tokens:3},{role:`assistant`,tokens:4}],6],expected:[{role:`system`,tokens:2},{role:`assistant`,tokens:4}]},{name:`全部可放`,args:[[{role:`system`,tokens:1},{role:`user`,tokens:2}],3],expected:[{role:`system`,tokens:1},{role:`user`,tokens:2}]},{name:`最新也放不下`,args:[[{role:`system`,tokens:2},{role:`user`,tokens:1},{role:`assistant`,tokens:8}],4],expected:[{role:`system`,tokens:2}]},{name:`空输入`,args:[[],3],expected:[]}]},{id:`top-k`,title:`按分数选择候选片段`,topic:`Top-k`,stage:`retrieval`,language:`python`,functionName:`top_k`,prompt:`items 包含 id 和 score。按 score 降序返回前 k 个 id；相同分数保留输入顺序；k≤0 返回空列表。本题允许排序，不要求堆。`,starter:`def top_k(items, k):
    return []
`,example:`[a:0.5,b:0.9,c:0.9], k=2 → [b,c]。`,hint:`sorted 的 key 可以使用 lambda；Python 稳定排序会保留同分顺序。`,solution:`def top_k(items, k):
    if k <= 0:
        return []
    ranked = sorted(items, key=lambda item: item["score"], reverse=True)
    return [item["id"] for item in ranked[:k]]
`,failure:`按出现次数排序与按相似度排序是不同问题；不要把 score 本身当作事实正确率。`,transfer:`大规模候选可比较小顶堆与全量排序的复杂度，同时评估噪声。`,cases:[{name:`同分稳定`,args:[[{id:`a`,score:.5},{id:`b`,score:.9},{id:`c`,score:.9}],2],expected:[`b`,`c`]},{name:`零个候选`,args:[[{id:`a`,score:1}],0],expected:[]},{name:`k 大于数量`,args:[[{id:`a`,score:-1}],4],expected:[`a`]},{name:`空输入`,args:[[],1],expected:[]}]},{id:`evidence`,title:`只保留可回查的证据 ID`,topic:`RAG 引用校验`,stage:`retrieval`,language:`python`,functionName:`supported_ids`,prompt:`实现 supported_ids(candidates, allowed_ids)：只保留 allowed_ids 中存在的 ID，去重并保持 candidates 的首次出现顺序。校验 ID 存在不代表证据支持结论。`,starter:`def supported_ids(candidates, allowed_ids):
    return []
`,example:`[a,unknown,a,b] 与 allowed=[a,b] → [a,b]。`,hint:`分别维护允许的集合与已经输出的集合。`,solution:`def supported_ids(candidates, allowed_ids):
    allowed = set(allowed_ids)
    result = []
    for item in candidates:
        if item in allowed and item not in result:
            result.append(item)
    return result
`,failure:`不能因为模型写出了一个看似合理的引用编号，就假定资料库中真的存在。`,transfer:`下一步再检查片段内容、版本与结论是否相符，区分存在性和支持性。`,cases:[{name:`未知与重复`,args:[[`a`,`unknown`,`a`,`b`],[`a`,`b`]],expected:[`a`,`b`]},{name:`没有允许资料`,args:[[`x`],[]],expected:[]},{name:`保持候选顺序`,args:[[`b`,`a`],[`a`,`b`]],expected:[`b`,`a`]}]},{id:`metrics`,title:`分开计算召回与精确率`,topic:`检索评测`,stage:`engineering`,language:`python`,functionName:`retrieval_metrics`,prompt:`expected 与 retrieved 是 ID 列表，按集合计算。返回 {recall: 命中/期望数, precision: 命中/检索数}。分母为空时约定：对应指标在两个集合都为空时为1，否则为0。`,starter:`def retrieval_metrics(expected, retrieved):
    return {"recall": 0, "precision": 0}
`,example:`expected=[a,b], retrieved=[a,x] → recall=0.5, precision=0.5。`,hint:`先转集合求交集，分别处理分母为零。`,solution:`def retrieval_metrics(expected, retrieved):
    wanted = set(expected)
    got = set(retrieved)
    hits = len(wanted & got)
    recall = hits / len(wanted) if wanted else (1 if not got else 0)
    precision = hits / len(got) if got else (1 if not wanted else 0)
    return {"recall": recall, "precision": precision}
`,failure:`分母不同，召回高不代表检索噪声少；本题空集合约定必须写进评测说明。`,transfer:`检索指标仍不能替代回答忠实性、任务成功率和人工错误分析。`,cases:[{name:`一半命中`,args:[[`a`,`b`],[`a`,`x`]],expected:{recall:.5,precision:.5}},{name:`重复 ID 只算一次`,args:[[`a`],[`a`,`a`]],expected:{recall:1,precision:1}},{name:`都空`,args:[[],[]],expected:{recall:1,precision:1}},{name:`没有召回`,args:[[`a`],[]],expected:{recall:0,precision:0}}]},{id:`lru`,title:`模拟 LRU 缓存访问`,topic:`缓存与数据结构`,stage:`deeper`,language:`python`,functionName:`simulate_lru`,prompt:`实现 simulate_lru(capacity, operations)，capacity≥1。操作为 ["put",key,value] 或 ["get",key]。仅返回所有 get 的结果，未命中为-1；get命中或put都将键变成最近使用，容量满淘汰最久未使用。先正确实现，再讨论平均O(1)。`,starter:`def simulate_lru(capacity, operations):
    cache = {}
    order = []
    results = []
    return results
`,example:`容量1：put a=2, put b=3, get a, get b → [-1,3]。`,hint:`用列表表示旧→新顺序；命中时删除旧位置并追加。此实现不是 O(1)。`,solution:`def simulate_lru(capacity, operations):
    cache, order, results = {}, [], []
    for operation in operations:
        action, key = operation[:2]
        if action == "get":
            results.append(cache.get(key, -1))
            if key not in cache:
                continue
        else:
            cache[key] = operation[2]
        if key in order:
            order.remove(key)
        order.append(key)
        if len(order) > capacity:
            del cache[order.pop(0)]
    return results
`,failure:`读取命中也必须改变使用顺序；缓存更新不是简单地只在新键时更新。`,transfer:`LRU 缓存不等于长期记忆；真实实现可用哈希表+双向链表达到平均 O(1)。`,cases:[{name:`淘汰旧键`,args:[1,[[`put`,`a`,2],[`put`,`b`,3],[`get`,`a`],[`get`,`b`]]],expected:[-1,3]},{name:`读取改变顺序`,args:[2,[[`put`,`a`,1],[`put`,`b`,2],[`get`,`a`],[`put`,`c`,3],[`get`,`b`],[`get`,`a`]]],expected:[1,-1,1]},{name:`更新已有键`,args:[1,[[`put`,`a`,1],[`put`,`a`,9],[`get`,`a`]]],expected:[9]}]},{id:`graph`,title:`检查课程依赖是否有环`,topic:`有向图与拓扑`,stage:`frameworks`,language:`python`,functionName:`can_finish`,prompt:`实现 can_finish(n, prerequisites)。节点是0到n-1，边 [course, prerequisite] 表示前置依赖，判断能否完成全部课程。n可为0。本题要求 DAG，Agent 状态图可以包含有终止条件的循环。`,starter:`def can_finish(n, prerequisites):
    return True
`,example:`n=2, [[1,0]] → True；[[1,0],[0,1]] → False。`,hint:`建立入度和邻接表；依次取入度为0的节点，计数是否等于 n。`,solution:`def can_finish(n, prerequisites):
    incoming = [0] * n
    edges = [[] for _ in range(n)]
    for course, prerequisite in prerequisites:
        edges[prerequisite].append(course)
        incoming[course] += 1
    queue = [node for node in range(n) if incoming[node] == 0]
    count = 0
    while queue:
        node = queue.pop(0)
        count += 1
        for neighbor in edges[node]:
            incoming[neighbor] -= 1
            if incoming[neighbor] == 0:
                queue.append(neighbor)
    return count == n
`,failure:`只从一个节点搜索会遗漏其他连通分量中的环。`,transfer:`任务依赖可用环检测；有意循环的 Agent 需要最大步数和退出条件。`,cases:[{name:`无环`,args:[3,[[1,0],[2,1]]],expected:!0},{name:`有环`,args:[2,[[0,1],[1,0]]],expected:!1},{name:`孤立节点`,args:[4,[[1,0]]],expected:!0},{name:`空图`,args:[0,[]],expected:!0}]},{id:`merge`,title:`合并同一文档的重叠区间`,topic:`排序与区间`,stage:`retrieval`,language:`python`,functionName:`merge_intervals`,prompt:`intervals 是闭区间 [start,end]，且 start≤end。合并相交或共享端点的区间，结果按start升序。它只模拟同一文档的坐标，不跨文档合并。`,starter:`def merge_intervals(intervals):
    return intervals
`,example:`[[5,7],[1,3],[3,6]] → [[1,7]]。`,hint:`先排序；比较当前起点与上一段终点，更新最大的终点。`,solution:`def merge_intervals(intervals):
    result = []
    for start, end in sorted(intervals):
        if result and start <= result[-1][1]:
            result[-1][1] = max(result[-1][1], end)
        else:
            result.append([start, end])
    return result
`,failure:`没有先排序会遗漏合并；“相邻”的定义必须明确，本题共享端点才算相交。`,transfer:`片段合并还要保留出处和标题上下文，不能仅按坐标推断语义完整。`,cases:[{name:`乱序与共享端点`,args:[[[5,7],[1,3],[3,6]]],expected:[[1,7]]},{name:`包含`,args:[[[1,9],[2,3]]],expected:[[1,9]]},{name:`不相交`,args:[[[1,2],[3,4]]],expected:[[1,2],[3,4]]},{name:`空输入`,args:[[]],expected:[]}]},{id:`p95`,title:`观察请求的尾部延迟`,topic:`质量与延迟`,stage:`engineering`,language:`python`,functionName:`p95`,prompt:`实现 p95(values)：对非负延迟列表使用 nearest-rank 定义，返回升序第 ceil(0.95*n) 项。空列表返回 None。本题样本很小，目的是理解定义，不是估计生产分布。`,starter:`def p95(values):
    return None
`,example:`[1,2,3,100] → 100；[] → None。`,hint:`正整数 n 可用 (95*n+99)//100 得到 ceil(0.95*n)，再将名次改为下标。`,solution:`def p95(values):
    if not values:
        return None
    ranked = sorted(values)
    return ranked[(95 * len(ranked) + 99) // 100 - 1]
`,failure:`平均延迟和 P95 回答不同问题；百分位还必须注明计算定义和样本范围。`,transfer:`同时观察任务成功率、成本、样本量和 P95，避免只优化一个数字。`,cases:[{name:`尾部值`,args:[[1,2,3,100]],expected:100},{name:`顺序无关`,args:[[5,1,4]],expected:5},{name:`20 个样本`,args:[Array.from({length:20},(e,t)=>t+1)],expected:19},{name:`空列表`,args:[[]],expected:null}]},{id:`sql-errors`,title:`统计每种请求状态`,topic:`SQL 分组`,stage:`prepare`,language:`sql`,prompt:`内存表 requests(id INTEGER,status TEXT,latency INTEGER)，统计每种 status 的数量，返回两列 status,total，按 status 升序。仅允许一条 SELECT 查询。表中有 success、timeout、error 三种状态。`,starter:`SELECT status, COUNT(*) AS total
FROM requests
-- 补充分组与排序
`,example:`每种状态只输出一行，而不是每条请求输出一次。`,hint:`GROUP BY status，再 ORDER BY status。`,solution:`SELECT status, COUNT(*) AS total FROM requests GROUP BY status ORDER BY status;`,failure:`漏掉 GROUP BY 可能返回任意一条 status 搭配全表数量。`,transfer:`将错误分类与执行日志关联；状态频率本身不解释根因。`,cases:[{name:`状态计数`,expected:[[`error`,1],[`success`,3],[`timeout`,2]]}]},{id:`sql-latency`,title:`筛出缓慢的成功请求`,topic:`SQL 筛选`,stage:`engineering`,language:`sql`,prompt:`同一内存表 requests，返回 status=success 且 latency≥100 的 id、latency，先按 latency 降序、同延迟按 id 升序。仅允许一条 SELECT。`,starter:`SELECT id, latency
FROM requests
WHERE status = 'success'
`,example:`筛选条件和排序条件解决不同问题，需要同时写。`,hint:`AND latency >= 100，ORDER BY latency DESC, id ASC。`,solution:`SELECT id, latency FROM requests WHERE status = 'success' AND latency >= 100 ORDER BY latency DESC, id ASC;`,failure:`只按耗时筛选会混入失败请求；没有稳定的次级排序会让结果顺序不确定。`,transfer:`真实线上查询还要考虑时间范围、索引和数据权限。`,cases:[{name:`慢成功请求`,expected:[[4,250],[6,250]]}]},...e],i=[{id:`i-agent-definition`,concept:`agent`,level:`解释`,title:`30 秒解释 Agent 与固定工作流的区别。`,followup:`给出一个普通代码更合适的场景。`,rubric:[`决策范围是否开放`,`工具结果如何影响下一步`,`成本和可控性取舍`],evidence:`用同一需求画出两种流程。`},{id:`i-token`,concept:`prompt`,level:`解释`,title:`Token 为什么不能简单等同于汉字数？`,followup:`预算统计如何与模型版本关联？`,rubric:[`分词器与文本有关`,`输入输出都占预算`,`用对应 tokenizer 或服务返回量核对`],evidence:`记录两段文本的实际分词差异，未实测时标为预期。`},{id:`i-json`,concept:`prompt`,level:`失败`,title:`结构化输出合法，但业务仍失败，可能漏了什么？`,followup:`姓名为空、日期过期和价格负数如何处理？`,rubric:[`语法、结构与业务校验分层`,`失败可观察`,`错误返回与修正路径`],evidence:`写出三个非法业务输入测试。`},{id:`i-tool-choice`,concept:`tools`,level:`取舍`,title:`什么时候不应该把能力开放成工具？`,followup:`高风险写入与只读查询有何差别？`,rubric:[`最小权限`,`输入验证和授权`,`副作用与人工确认`],evidence:`列出一个工具的权限和拒绝条件。`},{id:`i-timeout`,concept:`tools`,level:`失败`,title:`预约超时后为什么不能直接重试？`,followup:`服务端已提交但响应丢失时怎么办？`,rubric:[`超时不等于未执行`,`幂等键或结果查询`,`有限重试与日志`],evidence:`画出超时但执行成功的时序图。`},{id:`i-idempotent`,concept:`tools`,level:`证据`,title:`怎样验证你的幂等处理真实有效？`,followup:`同一键不同内容、并发和过期如何测？`,rubric:[`唯一执行记录`,`冲突检测与原子性`,`重放同一结果`],evidence:`提交重复、并发和冲突请求的测试报告。`},{id:`i-memory-scope`,concept:`memory`,level:`解释`,title:`会话状态、缓存和长期记忆分别解决什么问题？`,followup:`LRU 适合作为完整长期记忆策略吗？`,rubric:[`生命周期与作用范围`,`缓存淘汰与事实价值不同`,`写入、更新、遗忘`],evidence:`为三类数据列出保存位置与失效规则。`},{id:`i-memory-conflict`,concept:`memory`,level:`失败`,title:`用户纠正事实后，旧记忆仍被召回怎么办？`,followup:`如何传播删除到索引和缓存？`,rubric:[`来源和时间`,`新旧版本与冲突规则`,`删除及回归验证`],evidence:`构造“偏好从 A 改为 B”的回归用例。`},{id:`i-context`,concept:`memory`,level:`取舍`,title:`近期窗口、摘要和长期检索如何组合？`,followup:`摘要漏掉关键约束时如何发现？`,rubric:[`容量与成本`,`原文证据和摘要损失`,`保护当前需求与工具调用对`],evidence:`比较同一任务在三种策略下的遗漏。`},{id:`i-rag-chain`,concept:`rag`,level:`解释`,title:`用一分钟画出 RAG 的数据流。`,followup:`在哪个环节保留来源标识？`,rubric:[`切分、索引、检索、重排、生成`,`来源随片段流转`,`检索与生成分开评价`],evidence:`给一个回答标注实际支持它的片段。`},{id:`i-rag-failure`,concept:`rag`,level:`失败`,title:`正确文档在库中，为什么还答错？`,followup:`你先检查哪一条日志或指标？`,rubric:[`切分上下文`,`召回与重排`,`生成忠实性`],evidence:`保留一个可复现失败查询及期望资料 ID。`},{id:`i-rag-k`,concept:`rag`,level:`取舍`,title:`提高 Top-k 有哪些收益和代价？`,followup:`更多证据会不会降低答案质量？`,rubric:[`召回与噪声`,`Token 和延迟`,`重排与相关性`],evidence:`在同一评测集比较两个 k，记录质量和成本。`},{id:`i-rag-version`,concept:`rag`,level:`失败`,title:`资料互相矛盾或过期时如何回答？`,followup:`能否只相信相似度最高的一条？`,rubric:[`版本与来源可信度`,`明确冲突或资料不足`,`避免无依据合并`],evidence:`准备两个版本冲突的测试问题。`},{id:`i-framework`,concept:`tools`,level:`取舍`,title:`框架替你解决什么，仍有哪些工程责任？`,followup:`什么时候直接调 API 更简单？`,rubric:[`统一接口与编排`,`业务校验和权限`,`可测试性与复杂度`],evidence:`对比一个最小例子的直接调用与框架实现。`},{id:`i-checkpoint`,concept:`mcp`,level:`失败`,title:`检查点为何不能保证外部写入恰好一次？`,followup:`写入后保存前退出会发生什么？`,rubric:[`重放边界`,`状态与外部事务分离`,`幂等执行记录`],evidence:`在具体执行点模拟一次崩溃恢复。`},{id:`i-mcp`,concept:`mcp`,level:`解释`,title:`MCP 统一了什么，不能替代什么？`,followup:`工具接入后还需要哪些权限检查？`,rubric:[`能力发现和调用协议`,`业务语义与权限仍需定义`,`服务边界与错误处理`],evidence:`说明一个工具的 schema、授权及失败返回。`},{id:`i-evaluation`,concept:`evaluation`,level:`证据`,title:`怎样证明演示之外的系统可靠性？`,followup:`你如何选评测输入？`,rubric:[`正常、缺资料、歧义、故障`,`检索与生成指标`,`对照和回归集`],evidence:`给出可复现评测集与结果表。`},{id:`i-latency`,concept:`evaluation`,level:`取舍`,title:`质量上升但费用和延迟翻倍，如何决策？`,followup:`为什么同时看平均值和 P95？`,rubric:[`用户任务目标`,`尾部延迟与成本预算`,`明确接受阈值`],evidence:`记录样本范围、质量、成本及延迟分布。`},{id:`i-project`,concept:`agent`,level:`证据`,title:`怎样讲清你亲自完成的项目贡献？`,followup:`哪项结果实测，哪项只是设计？`,rubric:[`需求与具体贡献`,`失败和修复`,`验证证据与限制`],evidence:`准备一个能现场复现的小任务。`},{id:`i-algorithm`,concept:`evaluation`,level:`证据`,title:`算法题解如何迁移到工程，而不生搬硬套？`,followup:`Top-k 高频、相似度排序与上下文选择有何差别？`,rubric:[`输入约束与目标不同`,`复杂度与正确性`,`工程中的额外边界`],evidence:`为原题和工程变式各写测试，并指出约束变化。`}];export{t as i,i as n,n as r,r as t};