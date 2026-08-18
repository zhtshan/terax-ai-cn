# explorer-markdown-outline Specification

## Purpose
侧栏大纲区块展示当前激活 Markdown 文件的标题层级结构，支持点击跳转和当前位置高亮，帮助用户在长文档中快速定位。
## Requirements
### Requirement: 展示 Markdown 标题层级大纲
当前激活文件为 Markdown 时，大纲区块 SHALL 展示该文件中所有标题（一级到六级）组成的层级列表，层级关系与标题级别一致。

#### Scenario: 打开多级标题的 Markdown 文件
- **WHEN** 用户打开一个包含多级标题的 Markdown 文件
- **THEN** 大纲区块显示标题层级列表，层级缩进与标题的 `#` 级别对应

### Requirement: 点击标题跳转并居中
点击大纲中的某个标题条目，SHALL 将编辑器光标移动到该标题所在位置并将其滚动到视口居中。

#### Scenario: 点击大纲标题
- **WHEN** 用户点击大纲列表中的一个标题条目
- **THEN** 编辑器跳转到该标题对应的行并居中显示

### Requirement: 编辑时防抖刷新大纲
用户编辑 Markdown 文档内容（增加、删除、修改标题）后，大纲列表 SHALL 在防抖延迟后自动刷新为最新的标题结构。

#### Scenario: 编辑标题后大纲刷新
- **WHEN** 用户在编辑器中修改、新增或删除一个标题
- **THEN** 大纲列表在短暂延迟后更新为反映最新文档结构的标题列表

### Requirement: 高亮当前光标所在标题
大纲 SHALL 根据编辑器当前光标所在位置，高亮显示光标所属的标题条目，并随光标移动或滚动更新。

#### Scenario: 光标移动到某标题范围内
- **WHEN** 用户将光标移动到某个标题及其内容范围内
- **THEN** 大纲中对应的标题条目被高亮，此前高亮的条目取消高亮

### Requirement: 非 Markdown 文件的空态
当前激活文件不是 Markdown 文件时，大纲区块 SHALL 显示空态提示而非报错或空白。

#### Scenario: 打开非 Markdown 文件
- **WHEN** 用户打开一个非 Markdown 类型的文件
- **THEN** 大纲区块显示空态提示，说明当前文件不支持大纲

