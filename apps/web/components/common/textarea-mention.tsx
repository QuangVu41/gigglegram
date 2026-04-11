import "quill-mention/dist/quill.mention.css";
// @ts-ignore
import "react-quill-new/dist/quill.snow.css";
import ReactQuill from "react-quill-new";
import "quill-mention/autoregister";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { hashtags } from "@repo/database";

interface TextareaMentionProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onMentionSelect?: (item: { id: string; value: string }) => void;
  onMentionIdsChange?: (ids: string[]) => void;
  onNewHashtagsChange?: (hashtags: string[]) => void;
}

const NEW_HASHTAG_PREFIX = "__new_hashtag__:";

type MentionSourceItem = {
  id: string;
  value: string;
  denotationChar?: string;
};

const getMentionValues = (editor: { getContents: () => { ops?: Array<{ insert?: unknown }> } }) => {
  const contents = editor.getContents();
  const hashtagIds = new Set<string>();
  const newHashtags = new Set<string>();

  contents.ops?.forEach((op) => {
    if (typeof op.insert !== "object" || op.insert === null) return;

    const mention = Object.values(op.insert).find((value) => {
      if (typeof value !== "object" || value === null) return false;
      return "id" in value;
    }) as { id?: unknown; value?: unknown; denotationChar?: unknown } | undefined;

    if (mention?.id !== undefined && mention.id !== null) {
      const id = String(mention.id);

      if (id.startsWith(NEW_HASHTAG_PREFIX)) {
        const mentionValue = typeof mention.value === "string" ? mention.value : id.replace(NEW_HASHTAG_PREFIX, "");
        newHashtags.add(`${mentionValue}`);
        return;
      }

      hashtagIds.add(id);
    }
  });

  return {
    hashtagIds: Array.from(hashtagIds),
    newHashtags: Array.from(newHashtags),
  };
};

const TextareaMention = ({
  value,
  onChange,
  placeholder,
  onMentionSelect,
  onMentionIdsChange,
  onNewHashtagsChange,
}: TextareaMentionProps) => {
  const mentionModule = {
    modules: {
      mention: {
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["#"],
        minChars: 1,
        source: async function (searchTerm: string, renderList: Function, mentionChar: string) {
          try {
            const res = await axiosGateway.get<FindManyResponse<typeof hashtags.$inferSelect>>(`/api/posts/hashtags`, {
              params: {
                keyword: searchTerm,
              },
            });
            const renderData: MentionSourceItem[] = res.data.data.map((item) => ({ id: item.id, value: item.name }));
            const hasExactMatch = renderData.some((item) =>
              item.value.toLowerCase().includes(searchTerm.toLowerCase()),
            );

            if (searchTerm.trim() && !hasExactMatch) {
              renderData.unshift({
                id: `${NEW_HASHTAG_PREFIX}${searchTerm}`,
                value: searchTerm,
                denotationChar: mentionChar,
              });
            }

            renderList(renderData, searchTerm);
          } catch {
            if (searchTerm.trim()) {
              renderList(
                [
                  {
                    id: `${NEW_HASHTAG_PREFIX}${searchTerm}`,
                    value: searchTerm,
                    denotationChar: mentionChar,
                  },
                ],
                searchTerm,
              );
              return;
            }

            renderList([], searchTerm);
          }
        },
        listItemClass: "ql-mention-list-item",
        renderLoading: () => {
          const div = document.createElement("div");
          div.className =
            "text-muted-foreground text-sm px-4 py-2 animate-pulse flex items-center justify-center gap-2";
          div.innerHTML = `
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-circle-icon lucide-loader-circle"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      `;
          return div;
        },
        onSelect: (item: { id: string; value: string }, insertItem: Function) => {
          onMentionSelect?.(item);
          insertItem(item);
        },
      },
    },
  };
  const modules = {
    mention: mentionModule.modules.mention,
    toolbar: false,
  };

  return (
    <ReactQuill
      modules={modules}
      value={value}
      onChange={(_content, _delta, _source, editor) => {
        onChange?.(_content);
        const mentionValues = getMentionValues(editor);
        onMentionIdsChange?.(mentionValues.hashtagIds);
        onNewHashtagsChange?.(mentionValues.newHashtags);
      }}
      placeholder={placeholder || "Enter text..."}
    />
  );
};

export default TextareaMention;
