import { SearchOutlined } from "@ant-design/icons";
import {
  searchKnowledgeDocuments,
  type KnowledgeSearchHitResponse,
} from "@api/knowledge";
import { Alert, Button, Divider, Empty, Input, Tag, Typography } from "antd";
import { Fragment, useEffect, useRef, useState } from "react";

interface KnowledgeSearchTabProps {
  knowledgeId: string | null;
}

type SearchStatus = "idle" | "success" | "empty" | "error";

const QUERY_PLACEHOLDER = "输入一段描述，验证这个知识库能否找到相关内容";
const MAX_CONTENT_PREVIEW_LENGTH = 120;

const truncateContent = (content: string): string => {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= MAX_CONTENT_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_CONTENT_PREVIEW_LENGTH).trimEnd()}...`;
};

const formatSimilarityScore = (distance: number | null): string => {
  if (distance === null || Number.isNaN(distance)) {
    return "0.00";
  }

  // Current Knowject collections are created with Chroma's default squared L2 distance.
  // Our local_dev embeddings are unit-normalized, so we convert squared L2 back to a
  // cosine-like relevance score with cos(theta) = 1 - d / 2.
  return Math.max(0, Math.min(1, 1 - distance / 2)).toFixed(2);
};

export const KnowledgeSearchTab = ({
  knowledgeId,
}: KnowledgeSearchTabProps) => {
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [items, setItems] = useState<KnowledgeSearchHitResponse[]>([]);
  const canSearch = Boolean(knowledgeId && query.trim());

  useEffect(() => {
    requestIdRef.current += 1;
    setQuery("");
    setLoading(false);
    setStatus("idle");
    setItems([]);
  }, [knowledgeId]);

  const handleSearch = async () => {
    const trimmedQuery = query.trim();

    if (!knowledgeId || !trimmedQuery || loading) {
      return;
    }

    setLoading(true);
    setStatus("idle");
    setItems([]);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const result = await searchKnowledgeDocuments({
        knowledgeId,
        query: trimmedQuery,
        topK: 5,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      if (result.items.length === 0) {
        setStatus("empty");
        return;
      }

      setItems(result.items);
      setStatus("success");
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      console.error("[KnowledgeSearchTab] 知识库检索失败:", error);
      setStatus("error");
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
          <div className="flex items-center p-1">
            <Input
              size="large"
              variant="borderless"
              value={query}
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder={QUERY_PLACEHOLDER}
              disabled={loading}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onPressEnter={() => {
                void handleSearch();
              }}
            />
            <Button
              type="primary"
              size="large"
              shape="circle"
              icon={<SearchOutlined />}
              className="mx-1 my-1 shrink-0 px-3"
              loading={loading}
              disabled={!canSearch}
              aria-label="检索"
              onClick={() => {
                void handleSearch();
              }}
            />
          </div>
        </div>

        {status === "idle" ? (
          <Typography.Text className="block text-sm text-slate-400">
            输入查询内容后，将返回最相关的 5 条知识片段及相关度分数
          </Typography.Text>
        ) : null}
      </div>

      {status === "idle" ? null : status === "error" ? (
        <div className="w-fit max-w-full">
          <Alert type="error" showIcon message="检索失败，请稍后重试" />
        </div>
      ) : status === "empty" ? (
        <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/50 py-8">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="未找到相关内容，可检查文档是否已完成索引"
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
          <div className="px-4 py-2">
            {items.map((item, index) => (
              <Fragment key={item.chunkId}>
                <div className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <Tag color="default" className="mr-0 max-w-[70%] truncate">
                      {item.source || "未命名文档"}
                    </Tag>
                    <Typography.Text className="shrink-0 text-xs text-slate-400">
                      相关度 {formatSimilarityScore(item.distance)}
                    </Typography.Text>
                  </div>
                  <Typography.Paragraph className="mb-0! mt-3 text-sm! leading-6! text-slate-500!">
                    {truncateContent(item.content)}
                  </Typography.Paragraph>
                </div>
                {index < items.length - 1 ? (
                  <Divider className="my-0! border-slate-200!" />
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
